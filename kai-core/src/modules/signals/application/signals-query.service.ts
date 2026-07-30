import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import {
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { CompanyPaymentMethodEntity } from '@modules/companies/domain/company-payment-method.entity';
import { SIGNAL_THRESHOLDS } from '../domain/signal.thresholds';
import { formatAttributeValues } from '../domain/signal.types';

export type ThresholdAlertRow = {
  productVariantId: string;
  sku: string;
  productName: string;
  attributesLabel: string;
  availableStock: number;
  minimumStock: number;
  reorderPoint: number | null;
  outOfStock: boolean;
};

export type DeadStockRow = {
  productVariantId: string;
  sku: string;
  productName: string;
  attributesLabel: string;
  onHand: number;
  unitCost: number;
  capital: number;
  lastSaleAt: string | null;
};

export type StockDaysCoverRow = {
  productVariantId: string;
  sku: string;
  productName: string;
  attributesLabel: string;
  onHand: number;
  avgDailySales: number;
  daysCover: number | null;
};

export type BuyNowRow = {
  productVariantId: string;
  sku: string;
  productName: string;
  attributesLabel: string;
  onHand: number;
  reorderPoint: number;
  suggestedQty: number;
  reason: string;
};

function parseAttributeValues(raw: unknown): string {
  if (typeof raw === 'string') {
    try {
      return formatAttributeValues(JSON.parse(raw));
    } catch {
      return '';
    }
  }
  return formatAttributeValues(raw);
}

@Injectable()
export class SignalsQueryService {
  constructor(
    @InjectRepository(StockLevel)
    private readonly stockLevelRepo: Repository<StockLevel>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly lineRepo: Repository<TransactionLine>,
    @InjectRepository(CompanyPaymentMethodEntity)
    private readonly paymentMethodRepo: Repository<CompanyPaymentMethodEntity>,
  ) {}

  /** SKUs bajo mínimo (misma lógica que analytics countThresholdAlerts), con detalle. */
  async listThresholdAlerts(companyId: string): Promise<ThresholdAlertRow[]> {
    const rows = await this.stockLevelRepo
      .createQueryBuilder('sl')
      .innerJoin('sl.variant', 'pv')
      .leftJoin('pv.product', 'p')
      .select('pv.id', 'productVariantId')
      .addSelect('pv.sku', 'sku')
      .addSelect('COALESCE(p.name, pv.sku)', 'productName')
      .addSelect('MAX((pv.attributeValues)::text)', 'attributeValues')
      .addSelect('SUM(sl.availableStock)', 'availableStock')
      .addSelect(
        `COALESCE(NULLIF(MAX(sl.minimumStock), 0), NULLIF(MAX(pv.minimumStock), 0), 0)`,
        'minimumStock',
      )
      .addSelect(
        `COALESCE(NULLIF(MAX(sl.reorderPoint), 0), NULLIF(MAX(pv.reorderPoint), 0), NULL)`,
        'reorderPoint',
      )
      .where('sl.companyId = :companyId', { companyId })
      .andWhere(
        'COALESCE(sl.minimumStockEnabled, pv.minimumStockEnabled, false) = true',
      )
      .andWhere(
        `sl.availableStock < COALESCE(NULLIF(sl.minimumStock, 0), NULLIF(pv.minimumStock, 0), 999999999)`,
      )
      .groupBy('pv.id')
      .addGroupBy('pv.sku')
      .addGroupBy('p.name')
      .getRawMany<{
        productVariantId: string;
        sku: string;
        productName: string;
        attributeValues: unknown;
        availableStock: string;
        minimumStock: string;
        reorderPoint: string | null;
      }>();

    return rows.map((r) => {
      const availableStock = Number(r.availableStock) || 0;
      return {
        productVariantId: r.productVariantId,
        sku: r.sku,
        productName: r.productName,
        attributesLabel: parseAttributeValues(r.attributeValues),
        availableStock,
        minimumStock: Number(r.minimumStock) || 0,
        reorderPoint:
          r.reorderPoint == null || r.reorderPoint === ''
            ? null
            : Number(r.reorderPoint),
        outOfStock: availableStock <= 0,
      };
    });
  }

  async countSalesAndVoids(
    companyId: string,
    from: Date,
    to: Date,
    branchId?: string,
  ): Promise<{ salesCount: number; voidCount: number }> {
    const qb = this.txRepo
      .createQueryBuilder('t')
      .select(
        `SUM(CASE WHEN t.transactionType = :sale AND t.status NOT IN (:...excluded) THEN 1 ELSE 0 END)`,
        'salesCount',
      )
      .addSelect(
        `SUM(CASE WHEN t.status = :voided THEN 1 ELSE 0 END)`,
        'voidCount',
      )
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.createdAt >= :from', { from })
      .andWhere('t.createdAt <= :to', { to })
      .setParameters({
        sale: TransactionType.SALE,
        voided: TransactionStatus.VOIDED,
        excluded: [TransactionStatus.CANCELLED, TransactionStatus.VOIDED],
      });
    if (branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId });
    }
    const raw = await qb.getRawOne<{ salesCount: string; voidCount: string }>();
    return {
      salesCount: Number(raw?.salesCount) || 0,
      voidCount: Number(raw?.voidCount) || 0,
    };
  }

  async feePercentByMethod(
    companyId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.paymentMethodRepo.find({
      where: { companyId, isActive: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      const fee = Number(row.feePercent);
      if (Number.isFinite(fee) && fee > 0) {
        map.set(row.method, fee);
      }
    }
    return map;
  }

  /**
   * Capital en SKUs con stock > 0 sin venta en `idleDays`.
   * Costo = último unitCost > 0 de línea de venta; si no hay, 0 (se excluye del capital).
   */
  async listDeadStock(
    companyId: string,
    idleDays = SIGNAL_THRESHOLDS.deadStock.idleDays,
  ): Promise<DeadStockRow[]> {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - idleDays);

    const stockRows = await this.stockLevelRepo
      .createQueryBuilder('sl')
      .innerJoin('sl.variant', 'pv')
      .leftJoin('pv.product', 'p')
      .select('pv.id', 'productVariantId')
      .addSelect('pv.sku', 'sku')
      .addSelect('COALESCE(p.name, pv.sku)', 'productName')
      .addSelect('MAX((pv.attributeValues)::text)', 'attributeValues')
      .addSelect('SUM(sl.availableStock)', 'onHand')
      .where('sl.companyId = :companyId', { companyId })
      .groupBy('pv.id')
      .addGroupBy('pv.sku')
      .addGroupBy('p.name')
      .having('SUM(sl.availableStock) > 0')
      .getRawMany<{
        productVariantId: string;
        sku: string;
        productName: string;
        attributeValues: unknown;
        onHand: string;
      }>();

    if (!stockRows.length) return [];

    const lastSales = await this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.transaction', 't')
      .select('l.productVariantId', 'productVariantId')
      .addSelect('MAX(t.createdAt)', 'lastSaleAt')
      .where('l.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :sale', { sale: TransactionType.SALE })
      .andWhere('t.status NOT IN (:...excluded)', {
        excluded: [TransactionStatus.CANCELLED, TransactionStatus.VOIDED],
      })
      .groupBy('l.productVariantId')
      .getRawMany<{ productVariantId: string; lastSaleAt: Date }>();

    const lastSaleMap = new Map(
      lastSales.map((r) => [r.productVariantId, new Date(r.lastSaleAt)]),
    );

    const deadIds = stockRows
      .filter((s) => {
        const last = lastSaleMap.get(s.productVariantId);
        return !last || last < cutoff;
      })
      .map((s) => s.productVariantId);

    if (!deadIds.length) return [];

    const costs = await this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.transaction', 't')
      .select('l.productVariantId', 'productVariantId')
      .addSelect('l.unitCost', 'unitCost')
      .addSelect('t.createdAt', 'createdAt')
      .where('l.companyId = :companyId', { companyId })
      .andWhere('l.productVariantId IN (:...ids)', { ids: deadIds })
      .andWhere('l.unitCost IS NOT NULL')
      .andWhere('l.unitCost > 0')
      .andWhere('t.transactionType = :sale', { sale: TransactionType.SALE })
      .orderBy('t.createdAt', 'DESC')
      .getRawMany<{
        productVariantId: string;
        unitCost: string;
        createdAt: Date;
      }>();

    const costMap = new Map<string, number>();
    for (const c of costs) {
      if (!costMap.has(c.productVariantId)) {
        costMap.set(c.productVariantId, Number(c.unitCost) || 0);
      }
    }

    return stockRows
      .filter((s) => deadIds.includes(s.productVariantId))
      .map((s) => {
        const onHand = Number(s.onHand) || 0;
        const unitCost = costMap.get(s.productVariantId) ?? 0;
        const last = lastSaleMap.get(s.productVariantId);
        return {
          productVariantId: s.productVariantId,
          sku: s.sku,
          productName: s.productName,
          attributesLabel: parseAttributeValues(s.attributeValues),
          onHand,
          unitCost,
          capital: onHand * unitCost,
          lastSaleAt: last ? last.toISOString() : null,
        };
      })
      .filter((r) => r.capital > 0)
      .sort((a, b) => b.capital - a.capital);
  }

  async listStockDaysCover(
    companyId: string,
    salesWindowDays = SIGNAL_THRESHOLDS.stockDaysCover.salesWindowDays,
    topN = SIGNAL_THRESHOLDS.stockDaysCover.topN,
  ): Promise<StockDaysCoverRow[]> {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - salesWindowDays);
    const to = new Date();

    const sales = await this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.transaction', 't')
      .innerJoin('l.productVariant', 'pv')
      .leftJoin('pv.product', 'p')
      .select('l.productVariantId', 'productVariantId')
      .addSelect('pv.sku', 'sku')
      .addSelect('COALESCE(p.name, pv.sku)', 'productName')
      .addSelect('MAX((pv.attributeValues)::text)', 'attributeValues')
      .addSelect('COALESCE(SUM(l.quantity), 0)', 'qtySold')
      .where('l.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :sale', { sale: TransactionType.SALE })
      .andWhere('t.status NOT IN (:...excluded)', {
        excluded: [TransactionStatus.CANCELLED, TransactionStatus.VOIDED],
      })
      .andWhere('t.createdAt >= :from', { from })
      .andWhere('t.createdAt <= :to', { to })
      .groupBy('l.productVariantId')
      .addGroupBy('pv.sku')
      .addGroupBy('p.name')
      .having('SUM(l.quantity) > 0')
      .orderBy('SUM(l.quantity)', 'DESC')
      .limit(Math.max(topN * 4, 40))
      .getRawMany<{
        productVariantId: string;
        sku: string;
        productName: string;
        attributeValues: unknown;
        qtySold: string;
      }>();

    if (!sales.length) return [];

    const ids = sales.map((s) => s.productVariantId);
    const stockRows = await this.stockLevelRepo
      .createQueryBuilder('sl')
      .select('sl.productVariantId', 'productVariantId')
      .addSelect('SUM(sl.availableStock)', 'onHand')
      .where('sl.companyId = :companyId', { companyId })
      .andWhere('sl.productVariantId IN (:...ids)', { ids })
      .groupBy('sl.productVariantId')
      .getRawMany<{ productVariantId: string; onHand: string }>();

    const onHandMap = new Map(
      stockRows.map((r) => [r.productVariantId, Number(r.onHand) || 0]),
    );

    const rows: StockDaysCoverRow[] = sales.map((s) => {
      const qtySold = Number(s.qtySold) || 0;
      const avgDailySales = qtySold / salesWindowDays;
      const onHand = onHandMap.get(s.productVariantId) ?? 0;
      const daysCover =
        avgDailySales > 0 ? onHand / avgDailySales : null;
      return {
        productVariantId: s.productVariantId,
        sku: s.sku,
        productName: s.productName,
        attributesLabel: parseAttributeValues(s.attributeValues),
        onHand,
        avgDailySales,
        daysCover,
      };
    });

    return rows
      .filter((r) => r.daysCover != null)
      .sort((a, b) => (a.daysCover ?? 999) - (b.daysCover ?? 999))
      .slice(0, topN);
  }

  async listBuyNowCandidates(
    companyId: string,
    topN = SIGNAL_THRESHOLDS.buyNow.topN,
  ): Promise<BuyNowRow[]> {
    const alerts = await this.listThresholdAlerts(companyId);
    const withReorder = alerts
      .map((a) => {
        const reorder =
          a.reorderPoint != null && a.reorderPoint > 0
            ? a.reorderPoint
            : a.minimumStock;
        const suggestedQty = Math.max(0, Math.ceil(reorder - a.availableStock));
        const reason = a.outOfStock
          ? 'Quiebre de stock'
          : `Bajo mínimo (${a.availableStock} < ${a.minimumStock})`;
        return {
          productVariantId: a.productVariantId,
          sku: a.sku,
          productName: a.productName,
          attributesLabel: a.attributesLabel,
          onHand: a.availableStock,
          reorderPoint: reorder,
          suggestedQty,
          reason,
        };
      })
      .filter((r) => r.suggestedQty > 0)
      .sort((a, b) => b.suggestedQty - a.suggestedQty)
      .slice(0, topN);
    return withReorder;
  }
}
