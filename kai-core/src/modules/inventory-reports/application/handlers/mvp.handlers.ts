import { Injectable } from '@nestjs/common';
import {
  InventoryReportHandler,
  InventoryReportHandlerContext,
  InventoryReportRunResult,
  bucketColumnLabel,
  bucketGrainLabel,
  buildSummaryDelta,
  compareDateRange,
  mergeBucketPoints,
  parseCompareWith,
  resolveGranularity,
} from '../../domain/inventory-report.types';
import { InventoryReportsQueryService } from '../inventory-reports-query.service';

function nowIso() {
  return new Date().toISOString();
}

function compareFootnote(
  current: { dateFrom: string; dateTo: string },
  cmp: { dateFrom: string; dateTo: string } | null,
): string[] {
  if (!cmp) return [];
  return [
    `Período actual: ${current.dateFrom} → ${current.dateTo}. Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`,
  ];
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function qty(n: number) {
  return Math.round(n * 1000) / 1000;
}

@Injectable()
export class StockValuationHandler implements InventoryReportHandler {
  readonly id = 'stock-valuation';
  readonly title = 'Valoración de stock (PMP)';
  readonly description =
    'Existencias físicas valorizadas a PMP vigente. SKUs sin PMP no suman al total monetario.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: InventoryReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    return {
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      productId: this.q.optionalUuid(params, 'productId'),
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const { rows, truncated } = await this.q.stockValuationRows(ctx.companyId, {
      storageIds: params.storageIds,
      productId: params.productId,
    });

    let qtyTotal = 0;
    let valorConPmp = 0;
    let lineasSinPmp = 0;
    for (const r of rows) {
      qtyTotal += r.qty;
      if (r.valor != null) valorConPmp += r.valor;
      else lineasSinPmp += 1;
    }

    const top = [...rows]
      .filter((r) => r.valor != null && r.valor > 0)
      .slice(0, 15);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        skuCount: rows.length,
        qtyTotal: qty(qtyTotal),
        valorConPmp: money(valorConPmp),
        lineasSinPmp,
      },
      series: [
        {
          id: 'top-valor-pmp',
          label: 'Top valorización (PMP)',
          chart: 'bar',
          points: top.map((r) => ({
            x: r.productName,
            y: money(r.valor ?? 0),
          })),
        },
      ],
      columns: [
        { key: 'sku', label: 'SKU' },
        { key: 'productName', label: 'Producto' },
        { key: 'storageLabel', label: 'Almacén' },
        { key: 'qty', label: 'Cant.', align: 'right' },
        { key: 'stockUnit', label: 'Unidad' },
        { key: 'pmp', label: 'PMP', align: 'right' },
        { key: 'valor', label: 'Valor', align: 'right' },
      ],
      rows: rows.map((r) => ({
        sku: r.sku,
        productName: r.productName,
        storageLabel: r.storageLabel,
        qty: qty(r.qty),
        stockUnit: r.stockUnit,
        pmp: r.pmp != null ? money(r.pmp) : null,
        valor: r.valor != null ? money(r.valor) : null,
      })),
      totals: {
        qty: qty(qtyTotal),
        valor: money(valorConPmp),
      },
      truncated,
      footnotes: [
        'Valoración = physicalStock × PMP vigente. Sin fallback a costo base.',
        `${lineasSinPmp} SKU(s) sin PMP excluidos del total monetario.`,
        ...(truncated ? ['Resultado truncado a 1000 filas.'] : []),
      ],
    };
  }
}

@Injectable()
export class StockAlertsHandler implements InventoryReportHandler {
  readonly id = 'stock-alerts';
  readonly title = 'Alertas de stock';
  readonly description =
    'Variantes con umbrales activos (mínimo, máximo o punto de reorden).';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: InventoryReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    return {
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      productId: this.q.optionalUuid(params, 'productId'),
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const { rows, kindCounts, truncated } = await this.q.stockAlertRows(
      ctx.companyId,
      {
        storageIds: params.storageIds,
        productId: params.productId,
      },
    );

    const kindLabel: Record<string, string> = {
      below_minimum: 'Bajo mínimo',
      above_maximum: 'Sobre máximo',
      reorder: 'Punto de reorden',
    };

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        alertRows: rows.length,
        belowMinimum: kindCounts.below_minimum ?? 0,
        aboveMaximum: kindCounts.above_maximum ?? 0,
        reorder: kindCounts.reorder ?? 0,
      },
      series: [
        {
          id: 'alerts-by-kind',
          label: 'Alertas por tipo',
          chart: 'pie',
          points: Object.entries(kindCounts).map(([k, y]) => ({
            x: kindLabel[k] ?? k,
            y,
          })),
        },
      ],
      columns: [
        { key: 'sku', label: 'SKU' },
        { key: 'productName', label: 'Producto' },
        { key: 'storageName', label: 'Almacén' },
        { key: 'physicalStock', label: 'Físico', align: 'right' },
        { key: 'minimumStock', label: 'Mín.', align: 'right' },
        { key: 'maximumStock', label: 'Máx.', align: 'right' },
        { key: 'reorderPoint', label: 'Reorden', align: 'right' },
        { key: 'alertKinds', label: 'Alertas' },
      ],
      rows: rows.map((r) => ({
        sku: r.sku,
        productName: r.productName,
        storageName: r.storageName,
        physicalStock: qty(r.physicalStock),
        minimumStock: r.minimumStock,
        maximumStock: r.maximumStock,
        reorderPoint: r.reorderPoint,
        alertKinds: r.kinds.map((k) => kindLabel[k] ?? k).join(', '),
      })),
      truncated,
      footnotes: [
        'Misma lógica de umbrales que Existencias / notificaciones de stock.',
        ...(truncated ? ['Resultado truncado a 1000 filas.'] : []),
        ...(rows.length === 0 ? ['Sin alertas activas con los filtros actuales.'] : []),
      ],
    };
  }
}

@Injectable()
export class StockByStorageHandler implements InventoryReportHandler {
  readonly id = 'stock-by-storage';
  readonly title = 'Stock por almacén';
  readonly description =
    'Cantidades y valoración PMP por bodega × unidad de stock (no se mezclan Un/Kg).';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: InventoryReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    return {
      productId: this.q.optionalUuid(params, 'productId'),
      stockUnitIds: this.q.optionalUuidList(params, 'stockUnitIds'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const { rows } = await this.q.stockByStorageRows(ctx.companyId, {
      productId: params.productId,
      stockUnitIds: params.stockUnitIds,
      storageIds: params.storageIds,
    });

    const valorTotal = rows.reduce((s, r) => s + r.valorConPmp, 0);
    const sinPmp = rows.reduce((s, r) => s + r.lineasSinPmp, 0);
    const storageCount = new Set(rows.map((r) => r.storageId)).size;

    // Valor PMP agregado por almacén (dinero sí se suma entre unidades).
    const valorByStorage = new Map<string, { name: string; valor: number }>();
    for (const r of rows) {
      const b = valorByStorage.get(r.storageId) ?? {
        name: r.storageName,
        valor: 0,
      };
      b.valor += r.valorConPmp;
      valorByStorage.set(r.storageId, b);
    }

    const units = [...new Set(rows.map((r) => r.stockUnit))].sort();
    const qtySeries = units.map((unit) => ({
      id: `qty-by-storage-${unit}`,
      label: `Cantidad por almacén (${unit})`,
      chart: 'bar' as const,
      points: rows
        .filter((r) => r.stockUnit === unit)
        .map((r) => ({ x: r.storageName, y: qty(r.qty) })),
    }));

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        storageCount,
        rowCount: rows.length,
        valorConPmp: money(valorTotal),
        lineasSinPmp: sinPmp,
      },
      series: [
        {
          id: 'valor-by-storage',
          label: 'Valor PMP por almacén',
          chart: 'bar',
          points: [...valorByStorage.values()].map((b) => ({
            x: b.name,
            y: money(b.valor),
          })),
        },
        ...qtySeries,
      ],
      columns: [
        { key: 'storageName', label: 'Almacén' },
        { key: 'stockUnit', label: 'Unidad' },
        { key: 'skuCount', label: 'SKUs', align: 'right' },
        { key: 'qty', label: 'Cant.', align: 'right' },
        { key: 'valorConPmp', label: 'Valor PMP', align: 'right' },
        { key: 'lineasSinPmp', label: 'Sin PMP', align: 'right' },
      ],
      rows: rows.map((r) => ({
        storageName: r.storageName,
        stockUnit: r.stockUnit,
        skuCount: r.skuCount,
        qty: qty(r.qty),
        valorConPmp: money(r.valorConPmp),
        lineasSinPmp: r.lineasSinPmp,
      })),
      totals: {
        skuCount: rows.reduce((s, r) => s + r.skuCount, 0),
        valorConPmp: money(valorTotal),
        lineasSinPmp: sinPmp,
      },
      footnotes: [
        'Valoración a PMP; líneas sin PMP no suman al valor.',
        'Cantidad = stock físico (no disponible ni reservado).',
        'Las cantidades no se suman entre unidades distintas (filas almacén × unidad).',
      ],
    };
  }
}

@Injectable()
export class StockByCategoryHandler implements InventoryReportHandler {
  readonly id = 'stock-by-category';
  readonly title = 'Stock por categoría';
  readonly description =
    'Existencias agrupadas por categoría × unidad de stock. Unidad de stock obligatoria.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: InventoryReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    return {
      stockUnitIds: this.q.requireUuidList(params, 'stockUnitIds'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      categoryIds: this.q.optionalUuidList(params, 'categoryIds'),
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const { rows } = await this.q.stockByCategoryRows(ctx.companyId, {
      stockUnitIds: params.stockUnitIds,
      storageIds: params.storageIds,
      categoryIds: params.categoryIds,
    });

    const valorTotal = rows.reduce((s, r) => s + r.valorConPmp, 0);
    const sinPmp = rows.reduce((s, r) => s + r.lineasSinPmp, 0);
    const units = [...new Set(rows.map((r) => r.stockUnit))].sort();

    const qtySeries = units.map((unit) => ({
      id: `qty-by-category-${unit}`,
      label: `Cantidad por categoría (${unit})`,
      chart: 'bar' as const,
      points: rows
        .filter((r) => r.stockUnit === unit)
        .map((r) => ({ x: r.categoryName, y: qty(r.qty) })),
    }));

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        rowCount: rows.length,
        categoryCount: new Set(rows.map((r) => r.categoryId ?? 'null')).size,
        valorConPmp: money(valorTotal),
        lineasSinPmp: sinPmp,
      },
      series: [
        {
          id: 'valor-by-category',
          label: 'Valor PMP por categoría',
          chart: 'bar',
          points: (() => {
            const byCat = new Map<string, number>();
            for (const r of rows) {
              byCat.set(
                r.categoryName,
                (byCat.get(r.categoryName) ?? 0) + r.valorConPmp,
              );
            }
            return [...byCat.entries()].map(([x, y]) => ({
              x,
              y: money(y),
            }));
          })(),
        },
        ...qtySeries,
      ],
      columns: [
        { key: 'categoryName', label: 'Categoría' },
        { key: 'stockUnit', label: 'Unidad' },
        { key: 'skuCount', label: 'SKUs', align: 'right' },
        { key: 'qty', label: 'Cant.', align: 'right' },
        { key: 'valorConPmp', label: 'Valor PMP', align: 'right' },
        { key: 'lineasSinPmp', label: 'Sin PMP', align: 'right' },
      ],
      rows: rows.map((r) => ({
        categoryName: r.categoryName,
        stockUnit: r.stockUnit,
        skuCount: r.skuCount,
        qty: qty(r.qty),
        valorConPmp: money(r.valorConPmp),
        lineasSinPmp: r.lineasSinPmp,
      })),
      totals: {
        skuCount: rows.reduce((s, r) => s + r.skuCount, 0),
        valorConPmp: money(valorTotal),
        lineasSinPmp: sinPmp,
      },
      footnotes: [
        'Las cantidades no se suman entre unidades distintas.',
        'Valor PMP sí puede agregarse entre unidades (es dinero).',
        ...(rows.length === 0 ? ['Sin existencias con los filtros actuales.'] : []),
      ],
    };
  }
}

@Injectable()
export class StockMovementTrendHandler implements InventoryReportHandler {
  readonly id = 'stock-movement-trend';
  readonly title = 'Variabilidad de stock (movimientos)';
  readonly description =
    'Neto diario de movimientos de inventario (Δ qty) por unidad de stock.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: InventoryReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      stockUnitIds: this.q.requireUuidList(params, 'stockUnitIds'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      productId: this.q.optionalUuid(params, 'productId'),
      granularity: resolveGranularity(params.granularity, range.dateFrom, range.dateTo),
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      stockUnitIds: params.stockUnitIds,
      storageIds: params.storageIds,
      productId: params.productId,
    };
    const grain = params.granularity;
    const data = await this.q.stockMovementTrendRows(
      ctx.companyId,
      range,
      filter,
      grain,
    );

    const familyLabel: Record<string, string> = {
      sale: 'Ventas',
      purchase: 'Compras',
      transfer: 'Transferencias',
      adjustment: 'Ajustes',
      other: 'Otros',
    };

    const summaryNums = movementTrendSummary(data);
    let summaryDelta: InventoryReportRunResult['summaryDelta'];
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const prev = await this.q.stockMovementTrendRows(
        ctx.companyId,
        prevRange,
        filter,
        grain,
      );
      summaryDelta = buildSummaryDelta(summaryNums, movementTrendSummary(prev));
    }

    const grainLabel = bucketGrainLabel(grain);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params: {
        ...params,
        ...(cmp ? { compareFrom: cmp.dateFrom, compareTo: cmp.dateTo } : {}),
      },
      summary: summaryNums,
      summaryDelta,
      series: [
        ...data.byUnitSeries.map((u) => ({
          id: `trend-${u.stockUnit}`,
          label: `Neto por ${grainLabel} (${u.stockUnit})`,
          chart: 'area' as const,
          points: u.points.map((p) => ({ x: p.day, y: qty(p.qtyNet) })),
        })),
        {
          id: 'events-by-family',
          label: 'Eventos por familia',
          chart: 'pie',
          points: Object.entries(data.familyCounts).map(([k, y]) => ({
            x: familyLabel[k] ?? k,
            y,
          })),
        },
      ],
      columns: [
        { key: 'day', label: bucketColumnLabel(grain) },
        { key: 'stockUnit', label: 'Unidad' },
        { key: 'qtyIn', label: 'Entradas', align: 'right' },
        { key: 'qtyOut', label: 'Salidas', align: 'right' },
        { key: 'qtyNet', label: 'Neto', align: 'right' },
        { key: 'lineCount', label: 'Líneas', align: 'right' },
      ],
      rows: data.rows.map((r) => ({
        day: r.day,
        stockUnit: r.stockUnit,
        qtyIn: qty(r.qtyIn),
        qtyOut: qty(r.qtyOut),
        qtyNet: qty(r.qtyNet),
        lineCount: r.lineCount,
      })),
      footnotes: [
        `Neto = entradas − salidas del ${grainLabel} (no es nivel de stock absoluto).`,
        'Una serie de gráfico por unidad de stock; no se mezclan Un/Kg.',
        ...(data.byUnitSeries.length > 1
          ? [
              'Con más de una unidad de stock con movimiento, las KPI de cantidad se omiten para no mezclar Un/Kg.',
            ]
          : []),
        `Tipos: ${['PURCHASE', 'SALE', 'TRANSFER_*', 'ADJUSTMENT_*', 'SALE_RETURN', 'PURCHASE_RETURN'].join(', ')}.`,
        ...compareFootnote(params, cmp),
        ...(data.truncated ? ['Resultado truncado a 1000 líneas de movimiento.'] : []),
        ...(data.rows.length === 0
          ? ['Sin movimientos en el período / filtros.']
          : []),
      ],
    };
  }
}

/** KPI del trend: cantidades solo con una unidad de stock (no mezclar Un/Kg). */
function movementTrendSummary(data: {
  rows: Array<{ qtyIn: number; qtyOut: number; qtyNet: number }>;
  byUnitSeries: Array<{ stockUnitId: string }>;
  familyCounts: Record<string, number>;
}): Record<string, number> {
  const base: Record<string, number> = {
    dayRows: data.rows.length,
    unitCount: data.byUnitSeries.length,
    lineEvents: Object.values(data.familyCounts).reduce((s, n) => s + n, 0),
  };
  if (data.byUnitSeries.length > 1) return base;
  return {
    ...base,
    qtyIn: qty(data.rows.reduce((s, r) => s + r.qtyIn, 0)),
    qtyOut: qty(data.rows.reduce((s, r) => s + r.qtyOut, 0)),
    qtyNet: qty(data.rows.reduce((s, r) => s + r.qtyNet, 0)),
  };
}

@Injectable()
export class InventoryTransfersHandler implements InventoryReportHandler {
  readonly id = 'inventory-transfers';
  readonly title = 'Transferencias entre almacenes';
  readonly description =
    'Movimientos TRANSFER_OUT del período (el ingreso espejo no se cuenta dos veces).';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: InventoryReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      productId: this.q.optionalUuid(params, 'productId'),
      granularity: resolveGranularity(params.granularity, range.dateFrom, range.dateTo),
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      storageIds: params.storageIds,
      productId: params.productId,
    };
    const grain = params.granularity;
    const data = await this.q.listTransfers(ctx.companyId, range, filter, grain);

    const summaryNums = {
      transferCount: data.transferCount,
      qtyMoved: qty(data.qtyMoved),
    };
    let summaryDelta: InventoryReportRunResult['summaryDelta'];
    let prevBuckets: Array<{ day: string; count: number; qty: number }> = [];
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const prev = await this.q.listTransfers(ctx.companyId, prevRange, filter, grain);
      prevBuckets = prev.byDay;
      summaryDelta = buildSummaryDelta(summaryNums, {
        transferCount: prev.transferCount,
        qtyMoved: qty(prev.qtyMoved),
      });
    }

    const grainLabel = bucketGrainLabel(grain);
    const countPoints = data.byDay.map((d) => ({ x: d.day, y: d.count }));
    const qtyPoints = data.byDay.map((d) => ({ x: d.day, y: qty(d.qty) }));
    const compareSuffix = prevBuckets.length ? ' (actual vs comparación)' : '';

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params: {
        ...params,
        ...(cmp ? { compareFrom: cmp.dateFrom, compareTo: cmp.dateTo } : {}),
      },
      summary: summaryNums,
      summaryDelta,
      series: [
        {
          id: 'transfers-by-day',
          label: `Transferencias por ${grainLabel}${compareSuffix}`,
          chart: 'bar',
          points: prevBuckets.length
            ? mergeBucketPoints(
                countPoints,
                prevBuckets.map((d) => ({ x: d.day, y: d.count })),
              )
            : countPoints,
        },
        {
          id: 'transfer-qty-by-day',
          label: `Cantidad transferida por ${grainLabel}${compareSuffix}`,
          chart: 'area',
          points: prevBuckets.length
            ? mergeBucketPoints(
                qtyPoints,
                prevBuckets.map((d) => ({ x: d.day, y: qty(d.qty) })),
              )
            : qtyPoints,
        },
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha' },
        { key: 'documentNumber', label: 'Documento' },
        { key: 'productSku', label: 'SKU' },
        { key: 'productName', label: 'Producto' },
        { key: 'quantity', label: 'Cant.', align: 'right' },
        { key: 'storageName', label: 'Origen' },
        { key: 'targetStorageName', label: 'Destino' },
      ],
      rows: data.rows,
      totals: {
        quantity: qty(data.qtyMoved),
        count: data.transferCount,
      },
      truncated: data.truncated,
      footnotes: [
        'Se cuentan solo TRANSFER_OUT (una transferencia = un evento). TRANSFER_IN no duplica el total de empresa.',
        ...compareFootnote(params, cmp),
        ...(data.truncated ? ['Resultado truncado a 1000 filas.'] : []),
        ...(data.transferCount === 0
          ? ['Sin transferencias en el período / filtros.']
          : []),
      ],
    };
  }
}

@Injectable()
export class InventoryAdjustmentsHandler implements InventoryReportHandler {
  readonly id = 'inventory-adjustments';
  readonly title = 'Ajustes de inventario';
  readonly description = 'Entradas y salidas por ADJUSTMENT_IN / ADJUSTMENT_OUT.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: InventoryReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      productId: this.q.optionalUuid(params, 'productId'),
      granularity: resolveGranularity(params.granularity, range.dateFrom, range.dateTo),
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      storageIds: params.storageIds,
      productId: params.productId,
    };
    const grain = params.granularity;
    const data = await this.q.listAdjustments(ctx.companyId, range, filter, grain);

    const summaryNums = {
      count: data.count,
      qtyIn: qty(data.qtyIn),
      qtyOut: qty(data.qtyOut),
      qtyNet: qty(data.qtyNet),
    };
    let summaryDelta: InventoryReportRunResult['summaryDelta'];
    let prevBuckets: Array<{ day: string; qtyNet: number }> = [];
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const prev = await this.q.listAdjustments(ctx.companyId, prevRange, filter, grain);
      prevBuckets = prev.byDay;
      summaryDelta = buildSummaryDelta(summaryNums, {
        count: prev.count,
        qtyIn: qty(prev.qtyIn),
        qtyOut: qty(prev.qtyOut),
        qtyNet: qty(prev.qtyNet),
      });
    }

    const grainLabel = bucketGrainLabel(grain);
    const netPoints = data.byDay.map((d) => ({ x: d.day, y: qty(d.qtyNet) }));

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params: {
        ...params,
        ...(cmp ? { compareFrom: cmp.dateFrom, compareTo: cmp.dateTo } : {}),
      },
      summary: summaryNums,
      summaryDelta,
      series: [
        {
          id: 'adjustments-net-by-day',
          label: `Neto de ajustes por ${grainLabel}${
            prevBuckets.length ? ' (actual vs comparación)' : ''
          }`,
          chart: 'bar',
          points: prevBuckets.length
            ? mergeBucketPoints(
                netPoints,
                prevBuckets.map((d) => ({ x: d.day, y: qty(d.qtyNet) })),
              )
            : netPoints,
        },
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha' },
        { key: 'transactionType', label: 'Tipo' },
        { key: 'documentNumber', label: 'Documento' },
        { key: 'productSku', label: 'SKU' },
        { key: 'productName', label: 'Producto' },
        { key: 'quantity', label: 'Cant.', align: 'right' },
        { key: 'storageName', label: 'Almacén' },
      ],
      rows: data.rows.map((r) => ({
        createdAt: r.createdAt,
        transactionType: r.transactionType,
        documentNumber: r.documentNumber,
        productSku: r.productSku,
        productName: r.productName,
        quantity: qty(r.quantity),
        storageName: r.storageName,
      })),
      totals: {
        quantity: qty(data.qtyNet),
        count: data.count,
      },
      truncated: data.truncated,
      footnotes: [
        'Solo ADJUSTMENT_IN / ADJUSTMENT_OUT. Neto = entradas − salidas.',
        ...compareFootnote(params, cmp),
        ...(data.truncated ? ['Resultado truncado a 1000 filas.'] : []),
        ...(data.count === 0 ? ['Sin ajustes en el período / filtros.'] : []),
      ],
    };
  }
}
