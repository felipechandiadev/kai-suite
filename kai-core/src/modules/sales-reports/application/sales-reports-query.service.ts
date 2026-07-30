import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import {
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { PromotionRedemption } from '@modules/promotions/domain/promotion-redemption.entity';
import {
  SALES_REPORT_MAX_ROWS,
  SalesReportMarginQuality,
} from '../domain/sales-report.types';

export const EXCLUDED_TX_STATUSES = [
  TransactionStatus.CANCELLED,
  TransactionStatus.VOIDED,
];

export type DateRange = { from: Date; to: Date; dateFrom: string; dateTo: string };

@Injectable()
export class SalesReportsQueryService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly lineRepo: Repository<TransactionLine>,
    @InjectRepository(CashSession)
    private readonly cashSessionRepo: Repository<CashSession>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(PromotionRedemption)
    private readonly redemptionRepo: Repository<PromotionRedemption>,
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

  baseSalesQb(
    companyId: string,
    range: DateRange,
    opts?: {
      pointOfSaleIds?: string[];
      branchId?: string;
      customerId?: string;
      paymentMethod?: string;
      cashSessionId?: string;
      types?: TransactionType[];
    },
  ): SelectQueryBuilder<Transaction> {
    const types = opts?.types?.length ? opts.types : [TransactionType.SALE];
    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType IN (:...types)', { types })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });

    if (opts?.pointOfSaleIds?.length) {
      qb.andWhere('t.pointOfSaleId IN (:...posIds)', { posIds: opts.pointOfSaleIds });
    }
    if (opts?.branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId: opts.branchId });
    }
    if (opts?.customerId) {
      qb.andWhere('t.customerId = :customerId', { customerId: opts.customerId });
    }
    if (opts?.paymentMethod) {
      qb.andWhere('t.paymentMethod = :paymentMethod', {
        paymentMethod: opts.paymentMethod as PaymentMethod,
      });
    }
    if (opts?.cashSessionId) {
      qb.andWhere('t.cashSessionId = :cashSessionId', {
        cashSessionId: opts.cashSessionId,
      });
    }
    return qb;
  }

  async salesByDay(
    companyId: string,
    range: DateRange,
    opts?: Parameters<SalesReportsQueryService['baseSalesQb']>[2],
  ): Promise<Array<{ day: string; total: number; count: number; avgTicket: number }>> {
    const qb = this.baseSalesQb(companyId, range, opts)
      .select(`to_char(date_trunc('day', t.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`date_trunc('day', t.createdAt)`)
      .orderBy(`date_trunc('day', t.createdAt)`, 'ASC');
    const rows = await qb.getRawMany<{ day: string; total: string; count: string }>();
    return rows.map((r) => {
      const total = Number(r.total) || 0;
      const count = Number(r.count) || 0;
      return {
        day: r.day,
        total,
        count,
        avgTicket: count > 0 ? total / count : 0,
      };
    });
  }

  async salesSummary(
    companyId: string,
    range: DateRange,
    opts?: Parameters<SalesReportsQueryService['baseSalesQb']>[2],
  ): Promise<{ total: number; count: number; avgTicket: number }> {
    const raw = await this.baseSalesQb(companyId, range, opts)
      .select('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .getRawOne<{ total: string; count: string }>();
    const total = Number(raw?.total) || 0;
    const count = Number(raw?.count) || 0;
    return { total, count, avgTicket: count > 0 ? total / count : 0 };
  }

  async listSalesDetail(
    companyId: string,
    range: DateRange,
    opts?: Parameters<SalesReportsQueryService['baseSalesQb']>[2],
  ): Promise<{ rows: Transaction[]; truncated: boolean }> {
    const rows = await this.baseSalesQb(companyId, range, opts)
      .orderBy('t.createdAt', 'DESC')
      .take(SALES_REPORT_MAX_ROWS + 1)
      .getMany();
    const truncated = rows.length > SALES_REPORT_MAX_ROWS;
    return {
      rows: truncated ? rows.slice(0, SALES_REPORT_MAX_ROWS) : rows,
      truncated,
    };
  }

  linesWithTxQb(
    companyId: string,
    range: DateRange,
    opts?: {
      pointOfSaleIds?: string[];
      customerId?: string;
      productId?: string;
      productVariantId?: string;
      types?: TransactionType[];
    },
  ): SelectQueryBuilder<TransactionLine> {
    const types = opts?.types?.length ? opts.types : [TransactionType.SALE];
    const qb = this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.transaction', 't')
      .where('l.companyId = :companyId', { companyId })
      .andWhere('t.transactionType IN (:...types)', { types })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });

    if (opts?.pointOfSaleIds?.length) {
      qb.andWhere('t.pointOfSaleId IN (:...posIds)', { posIds: opts.pointOfSaleIds });
    }
    if (opts?.customerId) {
      qb.andWhere('t.customerId = :customerId', { customerId: opts.customerId });
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

  async marginForLines(
    companyId: string,
    range: DateRange,
    opts?: Parameters<SalesReportsQueryService['linesWithTxQb']>[2],
  ): Promise<{
    revenue: number;
    cogs: number;
    margin: number;
    quality: SalesReportMarginQuality;
  }> {
    const raw = await this.linesWithTxQb(companyId, range, opts)
      .select('COALESCE(SUM(l.subtotal), 0)', 'revenue')
      .addSelect(
        `COALESCE(SUM(CASE WHEN l.unitCost IS NOT NULL AND l.unitCost > 0 THEN l.unitCost * l.quantity ELSE 0 END), 0)`,
        'cogs',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN l.unitCost IS NOT NULL AND l.unitCost > 0 THEN 1 ELSE 0 END), 0)`,
        'linesWithCost',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN l.unitCost IS NULL OR l.unitCost <= 0 THEN 1 ELSE 0 END), 0)`,
        'linesMissingCost',
      )
      .getRawOne<{
        revenue: string;
        cogs: string;
        linesWithCost: string;
        linesMissingCost: string;
      }>();

    const revenue = Number(raw?.revenue) || 0;
    const cogs = Number(raw?.cogs) || 0;
    const linesWithCost = Number(raw?.linesWithCost) || 0;
    const linesMissingCost = Number(raw?.linesMissingCost) || 0;
    const totalLines = linesWithCost + linesMissingCost;
    return {
      revenue,
      cogs,
      margin: revenue - cogs,
      quality: {
        linesWithCost,
        linesMissingCost,
        coveragePct: totalLines > 0 ? Math.round((linesWithCost / totalLines) * 1000) / 10 : 0,
      },
    };
  }

  marginFootnote(quality: SalesReportMarginQuality): string {
    return `Margen según costo registrado al vender (unitCost). Cobertura ${quality.coveragePct}% (${quality.linesWithCost} líneas con costo / ${quality.linesWithCost + quality.linesMissingCost} totales).`;
  }

  async productSalesByDay(
    companyId: string,
    range: DateRange,
    productId: string,
    pointOfSaleIds?: string[],
  ): Promise<Array<{ day: string; qty: number; amount: number }>> {
    const qb = this.linesWithTxQb(companyId, range, { productId, pointOfSaleIds })
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

  async productSalesLines(
    companyId: string,
    range: DateRange,
    productId: string,
    pointOfSaleIds?: string[],
  ): Promise<{ rows: Array<Record<string, unknown>>; truncated: boolean }> {
    const qb = this.linesWithTxQb(companyId, range, { productId, pointOfSaleIds })
      .select('t.id', 'transactionId')
      .addSelect('t.createdAt', 'createdAt')
      .addSelect('l.productName', 'productName')
      .addSelect('l.productSku', 'productSku')
      .addSelect('l.quantity', 'quantity')
      .addSelect('l.unitPrice', 'unitPrice')
      .addSelect('l.unitCost', 'unitCost')
      .addSelect('l.subtotal', 'subtotal')
      .addSelect('l.total', 'total')
      .orderBy('t.createdAt', 'DESC')
      .take(SALES_REPORT_MAX_ROWS + 1);

    const raw = await qb.getRawMany<Record<string, unknown>>();
    const truncated = raw.length > SALES_REPORT_MAX_ROWS;
    const slice = truncated ? raw.slice(0, SALES_REPORT_MAX_ROWS) : raw;
    return {
      truncated,
      rows: slice.map((r) => {
        const qty = Number(r.quantity) || 0;
        const unitCost = r.unitCost != null ? Number(r.unitCost) : null;
        const subtotal = Number(r.subtotal) || 0;
        const margin =
          unitCost != null && unitCost > 0 ? subtotal - unitCost * qty : null;
        return {
          transactionId: r.transactionId,
          createdAt: r.createdAt,
          productName: r.productName,
          productSku: r.productSku,
          quantity: qty,
          unitPrice: Number(r.unitPrice) || 0,
          unitCost,
          subtotal,
          total: Number(r.total) || 0,
          margin,
        };
      }),
    };
  }

  async returnsByDay(
    companyId: string,
    range: DateRange,
    opts?: { customerId?: string; productId?: string; pointOfSaleIds?: string[] },
  ) {
    const qb = this.baseSalesQb(companyId, range, {
      ...opts,
      types: [TransactionType.SALE_RETURN],
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
    opts?: { customerId?: string; productId?: string; pointOfSaleIds?: string[] },
  ) {
    if (opts?.productId) {
      const qb = this.linesWithTxQb(companyId, range, {
        productId: opts.productId,
        customerId: opts.customerId,
        pointOfSaleIds: opts.pointOfSaleIds,
        types: [TransactionType.SALE_RETURN],
      })
        .select('t.id', 'id')
        .addSelect('t.createdAt', 'createdAt')
        .addSelect('t.total', 'total')
        .addSelect('t.customerId', 'customerId')
        .addSelect('l.productName', 'productName')
        .addSelect('l.quantity', 'quantity')
        .orderBy('t.createdAt', 'DESC')
        .take(SALES_REPORT_MAX_ROWS + 1);
      const raw = await qb.getRawMany();
      const truncated = raw.length > SALES_REPORT_MAX_ROWS;
      return {
        truncated,
        rows: (truncated ? raw.slice(0, SALES_REPORT_MAX_ROWS) : raw).map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          total: Number(r.total) || 0,
          customerId: r.customerId,
          productName: r.productName,
          quantity: Number(r.quantity) || 0,
        })),
      };
    }
    const { rows, truncated } = await this.listSalesDetail(companyId, range, {
      ...opts,
      types: [TransactionType.SALE_RETURN],
    });
    return {
      truncated,
      rows: rows.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        total: Number(t.total) || 0,
        customerId: t.customerId ?? null,
        paymentMethod: t.paymentMethod,
        status: t.status,
      })),
    };
  }

  async customerPurchasesByMonth(companyId: string, range: DateRange, customerId: string) {
    const qb = this.baseSalesQb(companyId, range, { customerId })
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

  async getCustomerName(companyId: string, customerId: string): Promise<string | null> {
    const c = await this.customerRepo.findOne({
      where: { id: customerId, companyId },
      relations: ['person'],
    });
    if (!c) return null;
    const person = c.person as
      | { firstName?: string; lastName?: string; businessName?: string; displayName?: string }
      | undefined;
    if (!person) return customerId;
    if (person.displayName) return person.displayName;
    if (person.businessName) return person.businessName;
    const full = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    return full || customerId;
  }

  async getCashSession(companyId: string, sessionId: string): Promise<CashSession | null> {
    return this.cashSessionRepo.findOne({ where: { id: sessionId, companyId } });
  }

  async paymentMixForSession(companyId: string, cashSessionId: string) {
    const qb = this.txRepo
      .createQueryBuilder('t')
      .select('t.paymentMethod', 'paymentMethod')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.cashSessionId = :cashSessionId', { cashSessionId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
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

  async paymentMix(
    companyId: string,
    range: DateRange,
    opts?: { pointOfSaleIds?: string[]; branchId?: string },
  ) {
    const qb = this.baseSalesQb(companyId, range, opts)
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

  async salesByPos(companyId: string, range: DateRange) {
    const qb = this.baseSalesQb(companyId, range)
      .select('t.pointOfSaleId', 'pointOfSaleId')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.pointOfSaleId')
      .orderBy('total', 'DESC');
    return (await qb.getRawMany<{ pointOfSaleId: string | null; total: string; count: string }>()).map(
      (r) => {
        const total = Number(r.total) || 0;
        const count = Number(r.count) || 0;
        return {
          pointOfSaleId: r.pointOfSaleId,
          total,
          count,
          avgTicket: count > 0 ? total / count : 0,
        };
      },
    );
  }

  async topProducts(
    companyId: string,
    range: DateRange,
    topN: number,
    pointOfSaleIds?: string[],
  ) {
    const qb = this.linesWithTxQb(companyId, range, { pointOfSaleIds })
      .select('l.productId', 'productId')
      .addSelect('MAX(l.productName)', 'productName')
      .addSelect('MAX(l.productSku)', 'productSku')
      .addSelect('COALESCE(SUM(l.quantity), 0)', 'qty')
      .addSelect('COALESCE(SUM(l.subtotal), 0)', 'amount')
      .addSelect(
        `COALESCE(SUM(CASE WHEN l.unitCost IS NOT NULL AND l.unitCost > 0 THEN l.subtotal - l.unitCost * l.quantity ELSE 0 END), 0)`,
        'margin',
      )
      .groupBy('l.productId')
      .orderBy('amount', 'DESC')
      .take(Math.min(Math.max(topN, 1), 100));
    return (await qb.getRawMany()).map((r) => ({
      productId: r.productId,
      productName: r.productName,
      productSku: r.productSku,
      qty: Number(r.qty) || 0,
      amount: Number(r.amount) || 0,
      margin: Number(r.margin) || 0,
    }));
  }

  async salesByCategory(companyId: string, range: DateRange, pointOfSaleIds?: string[]) {
    const qb = this.linesWithTxQb(companyId, range, { pointOfSaleIds })
      .leftJoin('l.product', 'p')
      .select('p.categoryId', 'categoryId')
      .addSelect('COALESCE(SUM(l.quantity), 0)', 'qty')
      .addSelect('COALESCE(SUM(l.subtotal), 0)', 'amount')
      .groupBy('p.categoryId')
      .orderBy('amount', 'DESC');
    return (await qb.getRawMany()).map((r) => ({
      categoryId: r.categoryId,
      qty: Number(r.qty) || 0,
      amount: Number(r.amount) || 0,
    }));
  }

  async creditNotes(
    companyId: string,
    range: DateRange,
    customerId?: string,
  ) {
    const { rows, truncated } = await this.listSalesDetail(companyId, range, {
      customerId,
      types: [TransactionType.CUSTOMER_CREDIT_NOTE],
    });
    return {
      truncated,
      rows: rows.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        total: Number(t.total) || 0,
        customerId: t.customerId ?? null,
        status: t.status,
      })),
      byDay: await this.salesByDay(companyId, range, {
        customerId,
        types: [TransactionType.CUSTOMER_CREDIT_NOTE],
      }),
    };
  }

  async promotionRedemptions(companyId: string, range: DateRange, promotionId?: string) {
    const qb = this.redemptionRepo
      .createQueryBuilder('r')
      .where('r.companyId = :companyId', { companyId })
      .andWhere('r.appliedAt >= :from', { from: range.from })
      .andWhere('r.appliedAt <= :to', { to: range.to });
    if (promotionId) {
      qb.andWhere('r.promotionId = :promotionId', { promotionId });
    }
    const byDayQb = qb
      .clone()
      .select(`to_char(date_trunc('day', r.appliedAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`date_trunc('day', r.appliedAt)`)
      .orderBy(`date_trunc('day', r.appliedAt)`, 'ASC');
    const byPromoQb = qb
      .clone()
      .select('r.promotionId', 'promotionId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.promotionId')
      .orderBy('count', 'DESC')
      .take(50);

    const [byDay, byPromo] = await Promise.all([
      byDayQb.getRawMany<{ day: string; count: string }>(),
      byPromoQb.getRawMany<{ promotionId: string; count: string }>(),
    ]);
    return {
      byDay: byDay.map((r) => ({ day: r.day, count: Number(r.count) || 0 })),
      byPromo: byPromo.map((r) => ({
        promotionId: r.promotionId,
        count: Number(r.count) || 0,
      })),
      total: byDay.reduce((s, r) => s + (Number(r.count) || 0), 0),
    };
  }

  async quotationsFunnel(companyId: string, range: DateRange) {
    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.QUOTATION })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });

    const byStatus = await qb
      .clone()
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .groupBy('t.status')
      .getRawMany<{ status: string; count: string; total: string }>();

    const byDay = await qb
      .clone()
      .select(`to_char(date_trunc('day', t.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`date_trunc('day', t.createdAt)`)
      .orderBy(`date_trunc('day', t.createdAt)`, 'ASC')
      .getRawMany<{ day: string; count: string }>();

    return {
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: Number(r.count) || 0,
        total: Number(r.total) || 0,
      })),
      byDay: byDay.map((r) => ({ day: r.day, count: Number(r.count) || 0 })),
    };
  }

  async backordersStatus(companyId: string, range: DateRange) {
    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.BACKORDER })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });

    const byStatus = await qb
      .clone()
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .groupBy('t.status')
      .getRawMany<{ status: string; count: string; total: string }>();

    const byDay = await qb
      .clone()
      .select(`to_char(date_trunc('day', t.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`date_trunc('day', t.createdAt)`)
      .orderBy(`date_trunc('day', t.createdAt)`, 'ASC')
      .getRawMany<{ day: string; count: string }>();

    return {
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: Number(r.count) || 0,
        total: Number(r.total) || 0,
      })),
      byDay: byDay.map((r) => ({ day: r.day, count: Number(r.count) || 0 })),
    };
  }
}
