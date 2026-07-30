import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import {
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import {
  computeVariantStockAlertKinds,
  stockLevelToThresholdSlice,
} from '@modules/stock-realtime/variant-stock-alert.util';
import { resolveStockThresholds } from '@modules/stock-realtime/stock-threshold-resolution.util';
import { variantThresholdDefaultsFromRow } from '@modules/stock-realtime/stock-threshold-field.util';
import { INVENTORY_REPORT_MAX_ROWS } from '../domain/inventory-report.types';
import {
  ADJUSTMENT_TYPES,
  STOCK_TREND_TYPES,
  TRANSFER_EVENT_TYPES,
  computePmpValue,
  inventoryMovementFamily,
  inventorySignedDelta,
} from '../domain/inventory-movement-map';

export const EXCLUDED_TX_STATUSES = [
  TransactionStatus.CANCELLED,
  TransactionStatus.VOIDED,
];

export type DateRange = { from: Date; to: Date; dateFrom: string; dateTo: string };

export type StockFilterOpts = {
  storageIds?: string[];
  productId?: string;
  stockUnitIds?: string[];
  categoryIds?: string[];
};

@Injectable()
export class InventoryReportsQueryService {
  constructor(
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
    @InjectRepository(TransactionLine)
    private readonly lineRepo: Repository<TransactionLine>,
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

  requireUuidList(params: Record<string, unknown>, key: string): string[] {
    const ids = this.optionalUuidList(params, key);
    if (!ids?.length) {
      throw new BadRequestException(`${key} es requerido (al menos una unidad de stock)`);
    }
    return ids;
  }

  private stockLevelsQb(
    companyId: string,
    opts?: StockFilterOpts,
  ): SelectQueryBuilder<StockLevel> {
    const qb = this.stockRepo
      .createQueryBuilder('sl')
      .innerJoinAndSelect('sl.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('variant.stockBaseUnit', 'stockBaseUnit')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('sl.storage', 'storage')
      .where('sl.companyId = :companyId', { companyId })
      .andWhere('variant.deletedAt IS NULL')
      .andWhere('(product.deletedAt IS NULL OR product.id IS NULL)');

    if (opts?.storageIds?.length) {
      qb.andWhere('sl.storageId IN (:...storageIds)', { storageIds: opts.storageIds });
    }
    if (opts?.productId) {
      qb.andWhere('variant.productId = :productId', { productId: opts.productId });
    }
    if (opts?.stockUnitIds?.length) {
      qb.andWhere('variant.stockBaseUnitId IN (:...stockUnitIds)', {
        stockUnitIds: opts.stockUnitIds,
      });
    }
    if (opts?.categoryIds?.length) {
      qb.andWhere('product.categoryId IN (:...categoryIds)', {
        categoryIds: opts.categoryIds,
      });
    }
    return qb;
  }

  private resolveStockUnitLabel(variant: {
    stockBaseUnit?: { symbol?: string; name?: string } | null;
    unit?: { symbol?: string; name?: string } | null;
  }): string {
    return (
      variant.stockBaseUnit?.symbol?.trim() ||
      variant.stockBaseUnit?.name?.trim() ||
      variant.unit?.symbol?.trim() ||
      '—'
    );
  }

  private resolveStockUnitId(variant: {
    stockBaseUnitId?: string | null;
    unitId?: string | null;
  }): string {
    return (
      (typeof variant.stockBaseUnitId === 'string' && variant.stockBaseUnitId.trim()) ||
      (typeof variant.unitId === 'string' && variant.unitId.trim()) ||
      'unknown'
    );
  }

  /**
   * Valoración consolidada por variante (como grilla de existencias).
   * Con filtro de almacén, qty = suma física en esos almacenes.
   */
  async stockValuationRows(
    companyId: string,
    opts?: StockFilterOpts,
  ): Promise<{
    rows: Array<{
      productVariantId: string;
      sku: string;
      productName: string;
      storageLabel: string;
      stockUnit: string;
      qty: number;
      pmp: number | null;
      valor: number | null;
    }>;
    truncated: boolean;
  }> {
    const levels = await this.stockLevelsQb(companyId, opts).getMany();
    const byVariant = new Map<
      string,
      {
        sku: string;
        productName: string;
        storageNames: string[];
        stockUnit: string;
        qty: number;
        pmp: number | null;
      }
    >();

    for (const sl of levels) {
      const variant = sl.variant;
      if (!variant) continue;
      const qty = Number(sl.physicalStock) || 0;
      const existing = byVariant.get(variant.id);
      const storageName = sl.storage?.name?.trim() || '—';
      const stockUnit =
        variant.stockBaseUnit?.symbol?.trim() ||
        variant.stockBaseUnit?.name?.trim() ||
        variant.unit?.symbol?.trim() ||
        '—';
      if (!existing) {
        byVariant.set(variant.id, {
          sku: variant.sku ?? '—',
          productName: variant.product?.name ?? '—',
          storageNames: [storageName],
          stockUnit,
          qty,
          pmp:
            variant.pmp != null && Number.isFinite(Number(variant.pmp))
              ? Number(variant.pmp)
              : null,
        });
      } else {
        existing.qty += qty;
        if (!existing.storageNames.includes(storageName)) {
          existing.storageNames.push(storageName);
        }
      }
    }

    let rows = [...byVariant.entries()].map(([productVariantId, v]) => ({
      productVariantId,
      sku: v.sku,
      productName: v.productName,
      storageLabel: v.storageNames.sort().join(', '),
      stockUnit: v.stockUnit,
      qty: Math.round(v.qty * 1000) / 1000,
      pmp: v.pmp,
      valor: computePmpValue(v.qty, v.pmp),
    }));

    rows.sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1) || a.sku.localeCompare(b.sku));
    const truncated = rows.length > INVENTORY_REPORT_MAX_ROWS;
    if (truncated) rows = rows.slice(0, INVENTORY_REPORT_MAX_ROWS);
    return { rows, truncated };
  }

  async stockByStorageRows(
    companyId: string,
    opts?: StockFilterOpts,
  ): Promise<{
    rows: Array<{
      storageId: string;
      storageName: string;
      stockUnitId: string;
      stockUnit: string;
      skuCount: number;
      qty: number;
      valorConPmp: number;
      lineasSinPmp: number;
    }>;
  }> {
    const levels = await this.stockLevelsQb(companyId, opts).getMany();
    const byKey = new Map<
      string,
      {
        storageId: string;
        storageName: string;
        stockUnitId: string;
        stockUnit: string;
        variantIds: Set<string>;
        qty: number;
        valorConPmp: number;
        lineasSinPmp: number;
      }
    >();

    for (const sl of levels) {
      const variant = sl.variant;
      if (!variant) continue;
      const stockUnitId = this.resolveStockUnitId(variant);
      const key = `${sl.storageId}::${stockUnitId}`;
      const qty = Number(sl.physicalStock) || 0;
      const pmp =
        variant.pmp != null && Number.isFinite(Number(variant.pmp))
          ? Number(variant.pmp)
          : null;
      const valor = computePmpValue(qty, pmp);
      let bucket = byKey.get(key);
      if (!bucket) {
        bucket = {
          storageId: sl.storageId,
          storageName: sl.storage?.name?.trim() || '—',
          stockUnitId,
          stockUnit: this.resolveStockUnitLabel(variant),
          variantIds: new Set(),
          qty: 0,
          valorConPmp: 0,
          lineasSinPmp: 0,
        };
        byKey.set(key, bucket);
      }
      if (sl.productVariantId) bucket.variantIds.add(sl.productVariantId);
      bucket.qty += qty;
      if (valor != null) bucket.valorConPmp += valor;
      else if (qty !== 0) bucket.lineasSinPmp += 1;
    }

    const rows = [...byKey.values()]
      .map((b) => ({
        storageId: b.storageId,
        storageName: b.storageName,
        stockUnitId: b.stockUnitId,
        stockUnit: b.stockUnit,
        skuCount: b.variantIds.size,
        qty: Math.round(b.qty * 1000) / 1000,
        valorConPmp: Math.round(b.valorConPmp * 100) / 100,
        lineasSinPmp: b.lineasSinPmp,
      }))
      .sort(
        (a, b) =>
          a.storageName.localeCompare(b.storageName) ||
          a.stockUnit.localeCompare(b.stockUnit) ||
          b.valorConPmp - a.valorConPmp,
      );

    return { rows };
  }

  async stockByCategoryRows(
    companyId: string,
    opts?: StockFilterOpts,
  ): Promise<{
    rows: Array<{
      categoryId: string | null;
      categoryName: string;
      stockUnitId: string;
      stockUnit: string;
      skuCount: number;
      qty: number;
      valorConPmp: number;
      lineasSinPmp: number;
    }>;
  }> {
    const levels = await this.stockLevelsQb(companyId, opts).getMany();
    const byKey = new Map<
      string,
      {
        categoryId: string | null;
        categoryName: string;
        stockUnitId: string;
        stockUnit: string;
        variantIds: Set<string>;
        qty: number;
        valorConPmp: number;
        lineasSinPmp: number;
      }
    >();

    for (const sl of levels) {
      const variant = sl.variant;
      if (!variant) continue;
      const categoryId = variant.product?.categoryId?.trim() || null;
      const categoryName =
        variant.product?.category?.name?.trim() || 'Sin categoría';
      const stockUnitId = this.resolveStockUnitId(variant);
      const key = `${categoryId ?? 'null'}::${stockUnitId}`;
      const qty = Number(sl.physicalStock) || 0;
      const pmp =
        variant.pmp != null && Number.isFinite(Number(variant.pmp))
          ? Number(variant.pmp)
          : null;
      const valor = computePmpValue(qty, pmp);
      let bucket = byKey.get(key);
      if (!bucket) {
        bucket = {
          categoryId,
          categoryName,
          stockUnitId,
          stockUnit: this.resolveStockUnitLabel(variant),
          variantIds: new Set(),
          qty: 0,
          valorConPmp: 0,
          lineasSinPmp: 0,
        };
        byKey.set(key, bucket);
      }
      if (sl.productVariantId) bucket.variantIds.add(sl.productVariantId);
      bucket.qty += qty;
      if (valor != null) bucket.valorConPmp += valor;
      else if (qty !== 0) bucket.lineasSinPmp += 1;
    }

    const rows = [...byKey.values()]
      .map((b) => ({
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        stockUnitId: b.stockUnitId,
        stockUnit: b.stockUnit,
        skuCount: b.variantIds.size,
        qty: Math.round(b.qty * 1000) / 1000,
        valorConPmp: Math.round(b.valorConPmp * 100) / 100,
        lineasSinPmp: b.lineasSinPmp,
      }))
      .sort(
        (a, b) =>
          a.categoryName.localeCompare(b.categoryName) ||
          a.stockUnit.localeCompare(b.stockUnit),
      );

    return { rows };
  }

  async stockAlertRows(
    companyId: string,
    opts?: StockFilterOpts,
  ): Promise<{
    rows: Array<{
      productVariantId: string;
      sku: string;
      productName: string;
      storageName: string;
      physicalStock: number;
      minimumStock: number;
      maximumStock: number;
      reorderPoint: number;
      alertKinds: string;
      kinds: string[];
    }>;
    kindCounts: Record<string, number>;
    truncated: boolean;
  }> {
    const filterStorageId = opts?.storageIds?.length === 1 ? opts.storageIds[0] : undefined;
    const levels = await this.stockLevelsQb(companyId, opts).getMany();

    const levelsByVariant = new Map<string, StockLevel[]>();
    for (const sl of levels) {
      const list = levelsByVariant.get(sl.productVariantId) ?? [];
      list.push(sl);
      levelsByVariant.set(sl.productVariantId, list);
    }

    // Need all levels per variant for totalPhysical when filtering one storage
    let allCompanyLevelsByVariant = levelsByVariant;
    if (filterStorageId || (opts?.storageIds?.length ?? 0) > 0) {
      const allLevels = await this.stockRepo.find({
        where: { companyId },
        relations: ['variant', 'variant.product', 'storage'],
      });
      allCompanyLevelsByVariant = new Map();
      for (const sl of allLevels) {
        if (sl.variant?.deletedAt) continue;
        const list = allCompanyLevelsByVariant.get(sl.productVariantId) ?? [];
        list.push(sl);
        allCompanyLevelsByVariant.set(sl.productVariantId, list);
      }
    }

    const rows: Array<{
      productVariantId: string;
      sku: string;
      productName: string;
      storageName: string;
      physicalStock: number;
      minimumStock: number;
      maximumStock: number;
      reorderPoint: number;
      alertKinds: string;
      kinds: string[];
    }> = [];
    const kindCounts: Record<string, number> = {};

    const variantIds = opts?.storageIds?.length
      ? new Set(levels.map((l) => l.productVariantId))
      : new Set(levelsByVariant.keys());

    for (const variantId of variantIds) {
      const allLevels = allCompanyLevelsByVariant.get(variantId) ?? [];
      if (!allLevels.length) continue;
      const variant = allLevels[0]?.variant;
      if (!variant || variant.deletedAt) continue;
      if (opts?.productId && variant.productId !== opts.productId) continue;

      const slices = allLevels.map(stockLevelToThresholdSlice);
      const kinds = computeVariantStockAlertKinds(variant, slices, {
        filterStorageId: filterStorageId ?? undefined,
      });
      if (!kinds.length) continue;

      const levelsToShow = filterStorageId
        ? allLevels.filter((l) => l.storageId === filterStorageId)
        : opts?.storageIds?.length
          ? allLevels.filter((l) => opts.storageIds!.includes(l.storageId))
          : allLevels;

      const variantRow = variantThresholdDefaultsFromRow(variant);
      const totalPhysical = slices.reduce(
        (s, sl) => s + Math.max(0, Number(sl.physicalStock) || 0),
        0,
      );

      for (const sl of levelsToShow.length ? levelsToShow : [allLevels[0]]) {
        const resolved = resolveStockThresholds(
          variantRow,
          stockLevelToThresholdSlice(sl),
          { totalPhysicalStock: totalPhysical },
        );
        const rowKinds =
          filterStorageId || opts?.storageIds?.length
            ? resolved.alerts
            : kinds;
        if (!rowKinds.length && !kinds.length) continue;
        const effectiveKinds = rowKinds.length ? rowKinds : kinds;
        for (const k of effectiveKinds) {
          kindCounts[k] = (kindCounts[k] ?? 0) + 1;
        }
        rows.push({
          productVariantId: variantId,
          sku: variant.sku ?? '—',
          productName: variant.product?.name ?? '—',
          storageName: sl.storage?.name?.trim() || '—',
          physicalStock: Number(sl.physicalStock) || 0,
          minimumStock: resolved.min,
          maximumStock: resolved.max,
          reorderPoint: resolved.reorder,
          alertKinds: effectiveKinds.join(', '),
          kinds: effectiveKinds,
        });
      }
    }

    rows.sort((a, b) => a.sku.localeCompare(b.sku) || a.storageName.localeCompare(b.storageName));
    const truncated = rows.length > INVENTORY_REPORT_MAX_ROWS;
    return {
      rows: truncated ? rows.slice(0, INVENTORY_REPORT_MAX_ROWS) : rows,
      kindCounts,
      truncated,
    };
  }

  private movementLinesQb(
    companyId: string,
    range: DateRange,
    types: string[],
    opts?: StockFilterOpts,
  ): SelectQueryBuilder<TransactionLine> {
    const qb = this.lineRepo
      .createQueryBuilder('tl')
      .innerJoinAndSelect('tl.transaction', 't')
      .leftJoinAndSelect('t.storageEntry', 'storage')
      .leftJoinAndSelect('t.targetStorageEntry', 'targetStorage')
      .leftJoinAndSelect('tl.productVariant', 'variant')
      .leftJoinAndSelect('variant.stockBaseUnit', 'stockBaseUnit')
      .where('tl.companyId = :companyId', { companyId })
      .andWhere('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType IN (:...types)', { types })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });

    if (opts?.storageIds?.length) {
      qb.andWhere(
        '(t.storageId IN (:...storageIds) OR t.targetStorageId IN (:...storageIds))',
        { storageIds: opts.storageIds },
      );
    }
    if (opts?.productId) {
      qb.andWhere('tl.productId = :productId', { productId: opts.productId });
    }
    if (opts?.stockUnitIds?.length) {
      qb.andWhere('variant.stockBaseUnitId IN (:...stockUnitIds)', {
        stockUnitIds: opts.stockUnitIds,
      });
    }
    if (opts?.categoryIds?.length) {
      qb.leftJoin('variant.product', 'product');
      qb.andWhere('product.categoryId IN (:...categoryIds)', {
        categoryIds: opts.categoryIds,
      });
    }
    return qb;
  }

  async stockMovementTrendRows(
    companyId: string,
    range: DateRange,
    opts?: StockFilterOpts,
  ): Promise<{
    rows: Array<{
      day: string;
      stockUnitId: string;
      stockUnit: string;
      qtyNet: number;
      qtyIn: number;
      qtyOut: number;
      lineCount: number;
    }>;
    byUnitSeries: Array<{
      stockUnitId: string;
      stockUnit: string;
      points: Array<{ day: string; qtyNet: number }>;
    }>;
    familyCounts: Record<string, number>;
    qtyNetTotalByUnit: Array<{ stockUnitId: string; stockUnit: string; qtyNet: number }>;
    truncated: boolean;
  }> {
    const qb = this.movementLinesQb(companyId, range, [...STOCK_TREND_TYPES], opts)
      .orderBy('t.createdAt', 'ASC')
      .addOrderBy('tl.id', 'ASC')
      .take(INVENTORY_REPORT_MAX_ROWS + 1);

    const lines = await qb.getMany();
    const truncated = lines.length > INVENTORY_REPORT_MAX_ROWS;
    const slice = truncated ? lines.slice(0, INVENTORY_REPORT_MAX_ROWS) : lines;

    type Agg = {
      stockUnitId: string;
      stockUnit: string;
      qtyIn: number;
      qtyOut: number;
      lineCount: number;
    };
    const dayUnit = new Map<string, Agg>();
    const familyCounts: Record<string, number> = {};
    const unitLabels = new Map<string, string>();

    for (const tl of slice) {
      const t = tl.transaction;
      if (!t?.createdAt) continue;
      const type = String(t.transactionType);
      const sign = inventorySignedDelta(type);
      if (sign === 0) continue;
      const family = inventoryMovementFamily(type) ?? 'other';
      familyCounts[family] = (familyCounts[family] ?? 0) + 1;

      const variant = tl.productVariant as
        | {
            stockBaseUnitId?: string;
            unitId?: string;
            stockBaseUnit?: { symbol?: string; name?: string } | null;
          }
        | undefined;
      const stockUnitId = variant
        ? this.resolveStockUnitId(variant)
        : 'unknown';
      const stockUnit = variant
        ? this.resolveStockUnitLabel(variant)
        : '—';
      unitLabels.set(stockUnitId, stockUnit);

      const day = new Date(t.createdAt).toISOString().slice(0, 10);
      const key = `${day}::${stockUnitId}`;
      const qtyAbs = Math.abs(Number(tl.quantity) || 0);
      let bucket = dayUnit.get(key);
      if (!bucket) {
        bucket = { stockUnitId, stockUnit, qtyIn: 0, qtyOut: 0, lineCount: 0 };
        dayUnit.set(key, bucket);
      }
      bucket.lineCount += 1;
      if (sign > 0) bucket.qtyIn += qtyAbs;
      else bucket.qtyOut += qtyAbs;
    }

    const rows = [...dayUnit.entries()]
      .map(([key, b]) => {
        const day = key.split('::')[0]!;
        return {
          day,
          stockUnitId: b.stockUnitId,
          stockUnit: b.stockUnit,
          qtyIn: Math.round(b.qtyIn * 1000) / 1000,
          qtyOut: Math.round(b.qtyOut * 1000) / 1000,
          qtyNet: Math.round((b.qtyIn - b.qtyOut) * 1000) / 1000,
          lineCount: b.lineCount,
        };
      })
      .sort(
        (a, b) =>
          a.day.localeCompare(b.day) || a.stockUnit.localeCompare(b.stockUnit),
      );

    const byUnitSeries: Array<{
      stockUnitId: string;
      stockUnit: string;
      points: Array<{ day: string; qtyNet: number }>;
    }> = [];
    const qtyNetTotalByUnit: Array<{
      stockUnitId: string;
      stockUnit: string;
      qtyNet: number;
    }> = [];

    for (const [stockUnitId, stockUnit] of unitLabels) {
      const unitRows = rows.filter((r) => r.stockUnitId === stockUnitId);
      byUnitSeries.push({
        stockUnitId,
        stockUnit,
        points: unitRows.map((r) => ({ day: r.day, qtyNet: r.qtyNet })),
      });
      qtyNetTotalByUnit.push({
        stockUnitId,
        stockUnit,
        qtyNet: Math.round(
          unitRows.reduce((s, r) => s + r.qtyNet, 0) * 1000,
        ) / 1000,
      });
    }

    byUnitSeries.sort((a, b) => a.stockUnit.localeCompare(b.stockUnit));
    qtyNetTotalByUnit.sort((a, b) => a.stockUnit.localeCompare(b.stockUnit));

    return {
      rows,
      byUnitSeries,
      familyCounts,
      qtyNetTotalByUnit,
      truncated,
    };
  }

  async listTransfers(
    companyId: string,
    range: DateRange,
    opts?: StockFilterOpts,
  ): Promise<{
    rows: Array<{
      createdAt: string;
      documentNumber: string;
      productSku: string;
      productName: string;
      quantity: number;
      storageName: string;
      targetStorageName: string;
    }>;
    byDay: Array<{ day: string; count: number; qty: number }>;
    transferCount: number;
    qtyMoved: number;
    truncated: boolean;
  }> {
    const qb = this.movementLinesQb(
      companyId,
      range,
      [...TRANSFER_EVENT_TYPES],
      opts,
    )
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('tl.id', 'DESC')
      .take(INVENTORY_REPORT_MAX_ROWS + 1);

    const lines = await qb.getMany();
    const truncated = lines.length > INVENTORY_REPORT_MAX_ROWS;
    const slice = truncated ? lines.slice(0, INVENTORY_REPORT_MAX_ROWS) : lines;

    let qtyMoved = 0;
    const rows = slice.map((tl) => {
      const t = tl.transaction!;
      const qty = Number(tl.quantity) || 0;
      qtyMoved += qty;
      return {
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : '',
        documentNumber: t.documentNumber ?? '—',
        productSku: tl.productSku ?? '—',
        productName: tl.productName ?? '—',
        quantity: qty,
        storageName: (t.storageEntry as { name?: string } | undefined)?.name ?? '—',
        targetStorageName:
          (t.targetStorageEntry as { name?: string } | undefined)?.name ?? '—',
      };
    });

    // Accurate totals from full query (not truncated slice) when possible
    const agg = await this.movementLinesQb(
      companyId,
      range,
      [...TRANSFER_EVENT_TYPES],
      opts,
    )
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tl.quantity), 0)', 'qty')
      .getRawOne<{ count: string; qty: string }>();

    const byDayAgg = await this.movementLinesQb(
      companyId,
      range,
      [...TRANSFER_EVENT_TYPES],
      opts,
    )
      .select(`to_char(date_trunc('day', t.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tl.quantity), 0)', 'qty')
      .groupBy(`date_trunc('day', t.createdAt)`)
      .orderBy(`date_trunc('day', t.createdAt)`, 'ASC')
      .getRawMany<{ day: string; count: string; qty: string }>();

    return {
      rows,
      byDay: byDayAgg.map((d) => ({
        day: d.day,
        count: Number(d.count) || 0,
        qty: Number(d.qty) || 0,
      })),
      transferCount: Number(agg?.count) || 0,
      qtyMoved: Number(agg?.qty) || qtyMoved,
      truncated,
    };
  }

  async listAdjustments(
    companyId: string,
    range: DateRange,
    opts?: StockFilterOpts,
  ): Promise<{
    rows: Array<{
      createdAt: string;
      transactionType: string;
      documentNumber: string;
      productSku: string;
      productName: string;
      quantity: number;
      signedQty: number;
      storageName: string;
    }>;
    byDay: Array<{ day: string; qtyIn: number; qtyOut: number; qtyNet: number }>;
    qtyIn: number;
    qtyOut: number;
    qtyNet: number;
    count: number;
    truncated: boolean;
  }> {
    const qb = this.movementLinesQb(companyId, range, [...ADJUSTMENT_TYPES], opts)
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('tl.id', 'DESC')
      .take(INVENTORY_REPORT_MAX_ROWS + 1);

    const lines = await qb.getMany();
    const truncated = lines.length > INVENTORY_REPORT_MAX_ROWS;
    const slice = truncated ? lines.slice(0, INVENTORY_REPORT_MAX_ROWS) : lines;

    const rows = slice.map((tl) => {
      const t = tl.transaction!;
      const qty = Number(tl.quantity) || 0;
      const sign = inventorySignedDelta(String(t.transactionType));
      return {
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : '',
        transactionType: String(t.transactionType),
        documentNumber: t.documentNumber ?? '—',
        productSku: tl.productSku ?? '—',
        productName: tl.productName ?? '—',
        quantity: qty,
        signedQty: qty * sign,
        storageName: (t.storageEntry as { name?: string } | undefined)?.name ?? '—',
      };
    });

    const agg = await this.movementLinesQb(
      companyId,
      range,
      [...ADJUSTMENT_TYPES],
      opts,
    )
      .select('t.transactionType', 'transactionType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tl.quantity), 0)', 'qty')
      .groupBy('t.transactionType')
      .getRawMany<{ transactionType: string; count: string; qty: string }>();

    let qtyIn = 0;
    let qtyOut = 0;
    let count = 0;
    for (const a of agg) {
      const q = Number(a.qty) || 0;
      const c = Number(a.count) || 0;
      count += c;
      if (a.transactionType === TransactionType.ADJUSTMENT_IN) qtyIn += q;
      if (a.transactionType === TransactionType.ADJUSTMENT_OUT) qtyOut += q;
    }

    const byDayRaw = await this.movementLinesQb(
      companyId,
      range,
      [...ADJUSTMENT_TYPES],
      opts,
    )
      .select(`to_char(date_trunc('day', t.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('t.transactionType', 'transactionType')
      .addSelect('COALESCE(SUM(tl.quantity), 0)', 'qty')
      .groupBy(`date_trunc('day', t.createdAt)`)
      .addGroupBy('t.transactionType')
      .orderBy(`date_trunc('day', t.createdAt)`, 'ASC')
      .getRawMany<{ day: string; transactionType: string; qty: string }>();

    const dayMap = new Map<string, { qtyIn: number; qtyOut: number }>();
    for (const r of byDayRaw) {
      const bucket = dayMap.get(r.day) ?? { qtyIn: 0, qtyOut: 0 };
      const q = Number(r.qty) || 0;
      if (r.transactionType === TransactionType.ADJUSTMENT_IN) bucket.qtyIn += q;
      if (r.transactionType === TransactionType.ADJUSTMENT_OUT) bucket.qtyOut += q;
      dayMap.set(r.day, bucket);
    }
    const byDay = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, b]) => ({
        day,
        qtyIn: b.qtyIn,
        qtyOut: b.qtyOut,
        qtyNet: b.qtyIn - b.qtyOut,
      }));

    return {
      rows,
      byDay,
      qtyIn,
      qtyOut,
      qtyNet: qtyIn - qtyOut,
      count,
      truncated,
    };
  }
}
