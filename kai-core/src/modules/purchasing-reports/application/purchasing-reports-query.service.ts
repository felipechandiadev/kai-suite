import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import {
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { PURCHASING_REPORT_MAX_ROWS } from '../domain/purchasing-report.types';

export const EXCLUDED_TX_STATUSES = [
  TransactionStatus.CANCELLED,
  TransactionStatus.VOIDED,
];

export type DateRange = { from: Date; to: Date; dateFrom: string; dateTo: string };

export type PurchaseFilterOpts = {
  supplierId?: string;
  supplierIds?: string[];
  storageIds?: string[];
  branchId?: string;
  paymentMethod?: string;
  types?: TransactionType[];
};

@Injectable()
export class PurchasingReportsQueryService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly lineRepo: Repository<TransactionLine>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  parseDateRange(params: Record<string, unknown>): DateRange {
    const fromRaw = params.dateFrom ?? params.from;
    const toRaw = params.dateTo ?? params.to;
    if (typeof fromRaw !== 'string' || !fromRaw.trim()) {
      throw new BadRequestException('dateFrom es requerido (YYYY-MM-DD)');
    }
    if (typeof toRaw !== 'string' || !toRaw.trim()) {
      throw new BadRequestException('dateTo es requerido (YYYY-MM-DD)');
    }
    const fromStr = fromRaw.trim().slice(0, 10);
    const toStr = toRaw.trim().slice(0, 10);
    const from = new Date(`${fromStr}T00:00:00.000`);
    const to = new Date(`${toStr}T23:59:59.999`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Rango de fechas inválido');
    }
    if (from > to) {
      throw new BadRequestException('dateFrom no puede ser posterior a dateTo');
    }
    return { from, to, dateFrom: fromStr, dateTo: toStr };
  }

  optionalUuid(params: Record<string, unknown>, key: string): string | undefined {
    const v = params[key];
    if (v == null || v === '') return undefined;
    if (typeof v !== 'string') {
      throw new BadRequestException(`${key} debe ser un UUID`);
    }
    return v;
  }

  optionalUuidList(params: Record<string, unknown>, key: string): string[] | undefined {
    const v = params[key];
    if (v == null || v === '') return undefined;
    if (Array.isArray(v)) {
      const ids = v.filter((x): x is string => typeof x === 'string' && x.length > 0);
      return ids.length ? ids : undefined;
    }
    if (typeof v === 'string') return [v];
    throw new BadRequestException(`${key} inválido`);
  }

  requireUuid(params: Record<string, unknown>, key: string): string {
    const v = this.optionalUuid(params, key);
    if (!v) throw new BadRequestException(`${key} es requerido`);
    return v;
  }

  basePurchaseQb(
    companyId: string,
    range: DateRange,
    opts?: PurchaseFilterOpts,
  ): SelectQueryBuilder<Transaction> {
    const types = opts?.types?.length ? opts.types : [TransactionType.SUPPLIER_INVOICE];
    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType IN (:...types)', { types })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });

    if (opts?.supplierId) {
      qb.andWhere('t.supplierId = :supplierId', { supplierId: opts.supplierId });
    }
    if (opts?.supplierIds?.length) {
      qb.andWhere('t.supplierId IN (:...supplierIds)', { supplierIds: opts.supplierIds });
    }
    if (opts?.storageIds?.length) {
      qb.andWhere('t.storageId IN (:...storageIds)', { storageIds: opts.storageIds });
    }
    if (opts?.branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId: opts.branchId });
    }
    if (opts?.paymentMethod) {
      qb.andWhere('t.paymentMethod = :paymentMethod', {
        paymentMethod: opts.paymentMethod as PaymentMethod,
      });
    }
    return qb;
  }

  async purchasesByDay(
    companyId: string,
    range: DateRange,
    opts?: PurchaseFilterOpts,
  ): Promise<
    Array<{
      day: string;
      total: number;
      subtotal: number;
      taxAmount: number;
      count: number;
      avgTicket: number;
    }>
  > {
    const qb = this.basePurchaseQb(companyId, range, opts)
      .select(`to_char(date_trunc('day', t.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COALESCE(SUM(t.subtotal), 0)', 'subtotal')
      .addSelect('COALESCE(SUM(t.taxAmount), 0)', 'taxAmount')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`date_trunc('day', t.createdAt)`)
      .orderBy(`date_trunc('day', t.createdAt)`, 'ASC');
    const rows = await qb.getRawMany<{
      day: string;
      total: string;
      subtotal: string;
      taxAmount: string;
      count: string;
    }>();
    return rows.map((r) => {
      const total = Number(r.total) || 0;
      const count = Number(r.count) || 0;
      return {
        day: r.day,
        total,
        subtotal: Number(r.subtotal) || 0,
        taxAmount: Number(r.taxAmount) || 0,
        count,
        avgTicket: count > 0 ? total / count : 0,
      };
    });
  }

  async purchasesSummary(
    companyId: string,
    range: DateRange,
    opts?: PurchaseFilterOpts,
  ): Promise<{
    total: number;
    subtotal: number;
    taxAmount: number;
    count: number;
    avgTicket: number;
  }> {
    const raw = await this.basePurchaseQb(companyId, range, opts)
      .select('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COALESCE(SUM(t.subtotal), 0)', 'subtotal')
      .addSelect('COALESCE(SUM(t.taxAmount), 0)', 'taxAmount')
      .addSelect('COUNT(*)', 'count')
      .getRawOne<{
        total: string;
        subtotal: string;
        taxAmount: string;
        count: string;
      }>();
    const total = Number(raw?.total) || 0;
    const count = Number(raw?.count) || 0;
    return {
      total,
      subtotal: Number(raw?.subtotal) || 0,
      taxAmount: Number(raw?.taxAmount) || 0,
      count,
      avgTicket: count > 0 ? total / count : 0,
    };
  }

  async listPurchaseDetail(
    companyId: string,
    range: DateRange,
    opts?: PurchaseFilterOpts,
  ): Promise<{ rows: Transaction[]; truncated: boolean }> {
    const rows = await this.basePurchaseQb(companyId, range, opts)
      .leftJoinAndSelect('t.supplier', 'supplier')
      .leftJoinAndSelect('supplier.person', 'supplierPerson')
      .orderBy('t.createdAt', 'DESC')
      .take(PURCHASING_REPORT_MAX_ROWS + 1)
      .getMany();
    const truncated = rows.length > PURCHASING_REPORT_MAX_ROWS;
    return {
      rows: truncated ? rows.slice(0, PURCHASING_REPORT_MAX_ROWS) : rows,
      truncated,
    };
  }

  linesWithTxQb(
    companyId: string,
    range: DateRange,
    opts?: {
      supplierId?: string;
      storageIds?: string[];
      productId?: string;
      productVariantId?: string;
      types?: TransactionType[];
    },
  ): SelectQueryBuilder<TransactionLine> {
    const types = opts?.types?.length ? opts.types : [TransactionType.PURCHASE];
    const qb = this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.transaction', 't')
      .where('l.companyId = :companyId', { companyId })
      .andWhere('t.transactionType IN (:...types)', { types })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });

    if (opts?.supplierId) {
      qb.andWhere('t.supplierId = :supplierId', { supplierId: opts.supplierId });
    }
    if (opts?.storageIds?.length) {
      qb.andWhere('t.storageId IN (:...storageIds)', { storageIds: opts.storageIds });
    }
    if (opts?.productId) {
      qb.andWhere('l.productId = :productId', { productId: opts.productId });
    }
    if (opts?.productVariantId) {
      qb.andWhere('l.productVariantId = :productVariantId', {
        productVariantId: opts.productVariantId,
      });
    }
    return qb;
  }

  async productPurchasesByDay(
    companyId: string,
    range: DateRange,
    productId: string,
    opts?: { storageIds?: string[]; supplierId?: string },
  ): Promise<Array<{ day: string; qty: number; amount: number }>> {
    const qb = this.linesWithTxQb(companyId, range, {
      productId,
      storageIds: opts?.storageIds,
      supplierId: opts?.supplierId,
    })
      .select(`to_char(date_trunc('day', t.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COALESCE(SUM(l.quantity), 0)', 'qty')
      .addSelect('COALESCE(SUM(l.subtotal), 0)', 'amount')
      .groupBy(`date_trunc('day', t.createdAt)`)
      .orderBy(`date_trunc('day', t.createdAt)`, 'ASC');
    const rows = await qb.getRawMany<{ day: string; qty: string; amount: string }>();
    return rows.map((r) => ({
      day: r.day,
      qty: Number(r.qty) || 0,
      amount: Number(r.amount) || 0,
    }));
  }

  async productPurchaseLines(
    companyId: string,
    range: DateRange,
    productId: string,
    opts?: { storageIds?: string[]; supplierId?: string },
  ): Promise<{ rows: Array<Record<string, unknown>>; truncated: boolean }> {
    const qb = this.linesWithTxQb(companyId, range, {
      productId,
      storageIds: opts?.storageIds,
      supplierId: opts?.supplierId,
    })
      .select('t.id', 'transactionId')
      .addSelect('t.createdAt', 'createdAt')
      .addSelect('t.documentNumber', 'documentNumber')
      .addSelect('l.productName', 'productName')
      .addSelect('l.productSku', 'productSku')
      .addSelect('l.quantity', 'quantity')
      .addSelect('l.unitCost', 'unitCost')
      .addSelect('l.unitPrice', 'unitPrice')
      .addSelect('l.subtotal', 'subtotal')
      .addSelect('l.total', 'total')
      .orderBy('t.createdAt', 'DESC')
      .take(PURCHASING_REPORT_MAX_ROWS + 1);

    const raw = await qb.getRawMany<Record<string, unknown>>();
    const truncated = raw.length > PURCHASING_REPORT_MAX_ROWS;
    const slice = truncated ? raw.slice(0, PURCHASING_REPORT_MAX_ROWS) : raw;
    return {
      truncated,
      rows: slice.map((r) => {
        const qty = Number(r.quantity) || 0;
        const unitCost = r.unitCost != null ? Number(r.unitCost) : null;
        return {
          transactionId: r.transactionId,
          createdAt: r.createdAt,
          documentNumber: r.documentNumber ?? null,
          productName: r.productName,
          productSku: r.productSku,
          quantity: qty,
          unitCost,
          unitPrice: Number(r.unitPrice) || 0,
          subtotal: Number(r.subtotal) || 0,
          total: Number(r.total) || 0,
        };
      }),
    };
  }

  async returnsByDay(
    companyId: string,
    range: DateRange,
    opts?: { supplierId?: string; productId?: string; storageIds?: string[] },
  ) {
    if (opts?.productId) {
      const qb = this.linesWithTxQb(companyId, range, {
        productId: opts.productId,
        supplierId: opts.supplierId,
        storageIds: opts.storageIds,
        types: [TransactionType.PURCHASE_RETURN],
      })
        .select(`to_char(date_trunc('day', t.createdAt), 'YYYY-MM-DD')`, 'day')
        .addSelect('COALESCE(SUM(t.total), 0)', 'total')
        .addSelect('COUNT(DISTINCT t.id)', 'count')
        .groupBy(`date_trunc('day', t.createdAt)`)
        .orderBy(`date_trunc('day', t.createdAt)`, 'ASC');
      return (await qb.getRawMany<{ day: string; total: string; count: string }>()).map(
        (r) => ({
          day: r.day,
          total: Number(r.total) || 0,
          count: Number(r.count) || 0,
        }),
      );
    }
    const qb = this.basePurchaseQb(companyId, range, {
      supplierId: opts?.supplierId,
      storageIds: opts?.storageIds,
      types: [TransactionType.PURCHASE_RETURN],
    })
      .select(`to_char(date_trunc('day', t.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`date_trunc('day', t.createdAt)`)
      .orderBy(`date_trunc('day', t.createdAt)`, 'ASC');
    return (await qb.getRawMany<{ day: string; total: string; count: string }>()).map(
      (r) => ({
        day: r.day,
        total: Number(r.total) || 0,
        count: Number(r.count) || 0,
      }),
    );
  }

  async listReturns(
    companyId: string,
    range: DateRange,
    opts?: { supplierId?: string; productId?: string; storageIds?: string[] },
  ) {
    if (opts?.productId) {
      const qb = this.linesWithTxQb(companyId, range, {
        productId: opts.productId,
        supplierId: opts.supplierId,
        storageIds: opts.storageIds,
        types: [TransactionType.PURCHASE_RETURN],
      })
        .select('t.id', 'id')
        .addSelect('t.createdAt', 'createdAt')
        .addSelect('t.total', 'total')
        .addSelect('t.supplierId', 'supplierId')
        .addSelect('t.documentNumber', 'documentNumber')
        .addSelect('l.productName', 'productName')
        .addSelect('l.quantity', 'quantity')
        .orderBy('t.createdAt', 'DESC')
        .take(PURCHASING_REPORT_MAX_ROWS + 1);
      const raw = await qb.getRawMany();
      const truncated = raw.length > PURCHASING_REPORT_MAX_ROWS;
      return {
        truncated,
        rows: (truncated ? raw.slice(0, PURCHASING_REPORT_MAX_ROWS) : raw).map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          total: Number(r.total) || 0,
          supplierId: r.supplierId,
          documentNumber: r.documentNumber ?? null,
          productName: r.productName,
          quantity: Number(r.quantity) || 0,
        })),
      };
    }
    const { rows, truncated } = await this.listPurchaseDetail(companyId, range, {
      supplierId: opts?.supplierId,
      storageIds: opts?.storageIds,
      types: [TransactionType.PURCHASE_RETURN],
    });
    return {
      truncated,
      rows: rows.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        total: Number(t.total) || 0,
        supplierId: t.supplierId ?? null,
        documentNumber: t.documentNumber ?? null,
        paymentMethod: t.paymentMethod,
        status: t.status,
      })),
    };
  }

  async supplierPurchasesByMonth(companyId: string, range: DateRange, supplierId: string) {
    const qb = this.basePurchaseQb(companyId, range, { supplierId })
      .select(`to_char(date_trunc('month', t.createdAt), 'YYYY-MM')`, 'month')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`date_trunc('month', t.createdAt)`)
      .orderBy(`date_trunc('month', t.createdAt)`, 'ASC');
    return (await qb.getRawMany<{ month: string; total: string; count: string }>()).map(
      (r) => ({
        month: r.month,
        total: Number(r.total) || 0,
        count: Number(r.count) || 0,
      }),
    );
  }

  async getSupplierName(companyId: string, supplierId: string): Promise<string | null> {
    const s = await this.supplierRepo.findOne({
      where: { id: supplierId, companyId },
      relations: ['person'],
    });
    if (!s) return null;
    const person = s.person as
      | { firstName?: string; lastName?: string; businessName?: string; displayName?: string }
      | undefined;
    if (!person) return s.alias?.trim() || supplierId;
    if (person.displayName) return person.displayName;
    if (person.businessName) return person.businessName;
    const full = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    return full || s.alias?.trim() || supplierId;
  }

  supplierDisplayName(tx: Transaction): string {
    const person = (tx.supplier as { person?: Record<string, unknown> } | undefined)?.person;
    if (person) {
      const bn = String(person.businessName ?? '').trim();
      if (bn) return bn;
      const dn = String(person.displayName ?? '').trim();
      if (dn) return dn;
      const n = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
      if (n) return n;
    }
    return tx.supplierId ?? '—';
  }

  async paymentMix(
    companyId: string,
    range: DateRange,
    opts?: { supplierId?: string; storageIds?: string[] },
  ) {
    const qb = this.basePurchaseQb(companyId, range, {
      ...opts,
      types: [TransactionType.SUPPLIER_PAYMENT],
    })
      .andWhere('t.status = :confirmed', { confirmed: TransactionStatus.CONFIRMED })
      .select('t.paymentMethod', 'paymentMethod')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.paymentMethod')
      .orderBy('total', 'DESC');
    return (await qb.getRawMany<{ paymentMethod: string; total: string; count: string }>()).map(
      (r) => ({
        paymentMethod: r.paymentMethod,
        total: Number(r.total) || 0,
        count: Number(r.count) || 0,
      }),
    );
  }
}
