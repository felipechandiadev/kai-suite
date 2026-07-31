import { Injectable } from '@nestjs/common';
import {
  PurchasingReportHandler,
  PurchasingReportHandlerContext,
  PurchasingReportRunResult,
  buildSummaryDelta,
  compareDateRange,
  parseCompareWith,
  resolveGranularity,
} from '../../domain/purchasing-report.types';
import { PurchasingReportsQueryService } from '../purchasing-reports-query.service';

function nowIso() {
  return new Date().toISOString();
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

/** Alinea buckets actual vs comparación por índice (mismo largo de período). */
export function mergeBucketPoints(
  current: Array<{ day: string; total: number }>,
  previous: Array<{ day: string; total: number }>,
): Array<{ x: string; y: number; y2?: number }> {
  const len = Math.max(current.length, previous.length);
  const points: Array<{ x: string; y: number; y2?: number }> = [];
  for (let i = 0; i < len; i++) {
    const cur = current[i];
    const prev = previous[i];
    points.push({
      x: cur?.day ?? prev?.day ?? String(i + 1),
      y: money(cur?.total ?? 0),
      y2: prev != null ? money(prev.total) : undefined,
    });
  }
  return points;
}

export function bucketLabel(grain: 'day' | 'week' | 'month'): string {
  return grain === 'month' ? 'mes' : grain === 'week' ? 'semana' : 'día';
}

export function bucketColumnLabel(grain: 'day' | 'week' | 'month'): string {
  return grain === 'month' ? 'Mes' : grain === 'week' ? 'Semana' : 'Día';
}

@Injectable()
export class PurchasesByPeriodHandler implements PurchasingReportHandler {
  readonly id = 'purchases-by-period';
  readonly title = 'Resumen de compras';
  readonly description =
    'Totales neto/IVA/bruto, cantidad de facturas proveedor y evolución diaria (SUPPLIER_INVOICE).';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: PurchasingReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      supplierId: this.q.optionalUuid(params, 'supplierId'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      branchId: this.q.optionalUuid(params, 'branchId'),
      granularity: resolveGranularity(params.granularity, range.dateFrom, range.dateTo),
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: PurchasingReportHandlerContext): Promise<PurchasingReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      supplierId: params.supplierId,
      storageIds: params.storageIds,
      branchId: params.branchId,
    };
    const grain = params.granularity;
    const [summary, byBucket] = await Promise.all([
      this.q.purchasesSummary(ctx.companyId, range, filter),
      this.q.purchasesByBucket(ctx.companyId, range, filter, grain),
    ]);

    const summaryNums = {
      totalPurchases: money(summary.total),
      subtotalNet: money(summary.subtotal),
      taxAmount: money(summary.taxAmount),
      purchaseCount: summary.count,
      avgTicket: money(summary.avgTicket),
    };

    let summaryDelta: PurchasingReportRunResult['summaryDelta'];
    let previousBuckets: Array<{ day: string; total: number }> = [];
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const [prevSummary, prevBuckets] = await Promise.all([
        this.q.purchasesSummary(ctx.companyId, prevRange, filter),
        this.q.purchasesByBucket(ctx.companyId, prevRange, filter, grain),
      ]);
      previousBuckets = prevBuckets;
      summaryDelta = buildSummaryDelta(summaryNums, {
        totalPurchases: money(prevSummary.total),
        subtotalNet: money(prevSummary.subtotal),
        taxAmount: money(prevSummary.taxAmount),
        purchaseCount: prevSummary.count,
        avgTicket: money(prevSummary.avgTicket),
      });
    }

    const grainLabel = bucketLabel(grain);
    const purchasePoints =
      previousBuckets.length > 0
        ? mergeBucketPoints(byBucket, previousBuckets)
        : byBucket.map((d) => ({ x: d.day, y: money(d.total) }));

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: summaryNums,
      summaryDelta,
      series: [
        {
          id: 'purchases-by-bucket',
          label:
            previousBuckets.length > 0
              ? `Compras por ${grainLabel} (actual vs comparación)`
              : `Compras por ${grainLabel}`,
          chart: 'area',
          points: purchasePoints,
        },
        {
          id: 'avg-ticket-by-bucket',
          label: `Ticket promedio por ${grainLabel}`,
          chart: 'bar',
          points: byBucket.map((d) => ({ x: d.day, y: money(d.avgTicket) })),
        },
      ],
      columns: [
        { key: 'day', label: bucketColumnLabel(grain) },
        { key: 'count', label: 'Facturas', align: 'right' },
        { key: 'subtotal', label: 'Neto', align: 'right' },
        { key: 'taxAmount', label: 'IVA', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'avgTicket', label: 'Ticket prom.', align: 'right' },
      ],
      rows: byBucket.map((d) => ({
        day: d.day,
        count: d.count,
        subtotal: money(d.subtotal),
        taxAmount: money(d.taxAmount),
        total: money(d.total),
        avgTicket: money(d.avgTicket),
      })),
      totals: {
        total: money(summary.total),
        subtotal: money(summary.subtotal),
        taxAmount: money(summary.taxAmount),
        count: summary.count,
      },
      footnotes: [
        'Totales fiscales desde facturas de proveedor (SUPPLIER_INVOICE). El PURCHASE de stock se valora al neto sin IVA.',
        ...(cmp ? [`Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`] : []),
      ],
    };
  }
}

@Injectable()
export class PurchaseDetailHandler implements PurchasingReportHandler {
  readonly id = 'purchase-detail';
  readonly title = 'Detalle de facturas proveedor';
  readonly description = 'Listado de facturas de compra del período con evolución diaria.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: PurchasingReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      supplierId: this.q.optionalUuid(params, 'supplierId'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      paymentMethod:
        typeof params.paymentMethod === 'string' && params.paymentMethod
          ? params.paymentMethod
          : undefined,
      granularity: resolveGranularity(params.granularity, range.dateFrom, range.dateTo),
    };
  }

  async run(ctx: PurchasingReportHandlerContext): Promise<PurchasingReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      supplierId: params.supplierId,
      storageIds: params.storageIds,
      paymentMethod: params.paymentMethod,
    };
    const grain = params.granularity;
    const [detail, byBucket, summary] = await Promise.all([
      this.q.listPurchaseDetail(ctx.companyId, range, filter),
      this.q.purchasesByBucket(ctx.companyId, range, filter, grain),
      this.q.purchasesSummary(ctx.companyId, range, filter),
    ]);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        totalPurchases: money(summary.total),
        purchaseCount: summary.count,
        avgTicket: money(summary.avgTicket),
        taxAmount: money(summary.taxAmount),
      },
      series: [
        {
          id: 'purchases-by-bucket',
          label: `Montos por ${bucketLabel(grain)}`,
          chart: 'bar',
          points: byBucket.map((d) => ({ x: d.day, y: money(d.total) })),
        },
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha' },
        { key: 'documentNumber', label: 'Documento' },
        { key: 'supplierName', label: 'Proveedor' },
        { key: 'paymentMethod', label: 'Pago' },
        { key: 'status', label: 'Estado' },
        { key: 'subtotal', label: 'Neto', align: 'right' },
        { key: 'taxAmount', label: 'IVA', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
      ],
      rows: detail.rows.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        documentNumber: t.documentNumber ?? t.documentFolio ?? '—',
        supplierName: this.q.supplierDisplayName(t),
        paymentMethod: t.paymentMethod,
        status: t.status,
        subtotal: money(Number(t.subtotal) || 0),
        taxAmount: money(Number(t.taxAmount) || 0),
        total: money(Number(t.total) || 0),
      })),
      totals: {
        total: money(summary.total),
        subtotal: money(summary.subtotal),
        taxAmount: money(summary.taxAmount),
        count: summary.count,
      },
      truncated: detail.truncated,
      footnotes: [
        'Detalle fiscal (SUPPLIER_INVOICE).',
        ...(detail.truncated
          ? ['Resultado truncado a 1000 filas. Acotá el rango o filtros.']
          : []),
      ],
    };
  }
}

@Injectable()
export class PurchasesByProductHandler implements PurchasingReportHandler {
  readonly id = 'purchases-by-product';
  readonly title = 'Compras de un producto';
  readonly description = 'Unidades y costo de un producto recibido en el período.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: PurchasingReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      productId: this.q.requireUuid(params, 'productId'),
      supplierId: this.q.optionalUuid(params, 'supplierId'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: PurchasingReportHandlerContext): Promise<PurchasingReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      storageIds: params.storageIds,
      supplierId: params.supplierId,
    };
    const [byDay, lines] = await Promise.all([
      this.q.productPurchasesByDay(ctx.companyId, range, params.productId, filter),
      this.q.productPurchaseLines(ctx.companyId, range, params.productId, filter),
    ]);

    const qty = byDay.reduce((s, d) => s + d.qty, 0);
    const amount = byDay.reduce((s, d) => s + d.amount, 0);

    const summaryNums = {
      quantity: money(qty),
      amount: money(amount),
    };

    let summaryDelta: PurchasingReportRunResult['summaryDelta'];
    let previousDays: Array<{ day: string; qty: number; amount: number }> = [];
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      previousDays = await this.q.productPurchasesByDay(
        ctx.companyId,
        prevRange,
        params.productId,
        filter,
      );
      summaryDelta = buildSummaryDelta(summaryNums, {
        quantity: money(previousDays.reduce((s, d) => s + d.qty, 0)),
        amount: money(previousDays.reduce((s, d) => s + d.amount, 0)),
      });
    }

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: summaryNums,
      summaryDelta,
      series: [
        {
          id: 'qty-by-day',
          label: 'Cantidad por día',
          chart: 'line',
          points: byDay.map((d) => ({ x: d.day, y: money(d.qty), y2: money(d.amount) })),
        },
        {
          id: 'amount-by-day',
          label:
            previousDays.length > 0
              ? 'Costo por día (actual vs comparación)'
              : 'Costo por día',
          chart: 'bar',
          points:
            previousDays.length > 0
              ? mergeBucketPoints(
                  byDay.map((d) => ({ day: d.day, total: d.amount })),
                  previousDays.map((d) => ({ day: d.day, total: d.amount })),
                )
              : byDay.map((d) => ({ x: d.day, y: money(d.amount) })),
        },
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha' },
        { key: 'documentNumber', label: 'Documento' },
        { key: 'productSku', label: 'SKU' },
        { key: 'quantity', label: 'Cant.', align: 'right' },
        { key: 'unitCost', label: 'Costo unit.', align: 'right' },
        { key: 'subtotal', label: 'Subtotal', align: 'right' },
      ],
      rows: lines.rows,
      totals: {
        quantity: money(qty),
        amount: money(amount),
      },
      truncated: lines.truncated,
      footnotes: [
        ...(cmp ? [`Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`] : []),
        ...(lines.truncated ? ['Resultado truncado a 1000 filas.'] : []),
      ],
    };
  }
}

@Injectable()
export class SupplierReturnsHandler implements PurchasingReportHandler {
  readonly id = 'supplier-returns';
  readonly title = 'Devoluciones a proveedor';
  readonly description = 'Devoluciones del período y ratio vs compras.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: PurchasingReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      supplierId: this.q.optionalUuid(params, 'supplierId'),
      productId: this.q.optionalUuid(params, 'productId'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
    };
  }

  async run(ctx: PurchasingReportHandlerContext): Promise<PurchasingReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      supplierId: params.supplierId,
      productId: params.productId,
      storageIds: params.storageIds,
    };
    const [byDay, list, purchasesSummary] = await Promise.all([
      this.q.returnsByDay(ctx.companyId, range, filter),
      this.q.listReturns(ctx.companyId, range, filter),
      this.q.purchasesSummary(ctx.companyId, range, {
        supplierId: params.supplierId,
        storageIds: params.storageIds,
      }),
    ]);
    const returnsTotal = byDay.reduce((s, d) => s + d.total, 0);
    const returnsCount = byDay.reduce((s, d) => s + d.count, 0);
    const ratio =
      purchasesSummary.total > 0
        ? Math.round((returnsTotal / purchasesSummary.total) * 1000) / 10
        : 0;

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        returnsTotal: money(returnsTotal),
        returnsCount,
        purchasesTotal: money(purchasesSummary.total),
        returnsVsPurchasesPct: ratio,
      },
      series: [
        {
          id: 'returns-by-day',
          label: 'Devoluciones por día',
          chart: 'bar',
          points: byDay.map((d) => ({ x: d.day, y: money(d.total) })),
        },
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha' },
        { key: 'documentNumber', label: 'Documento' },
        { key: 'id', label: 'ID' },
        { key: 'productName', label: 'Producto' },
        { key: 'quantity', label: 'Cant.', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
      ],
      rows: list.rows,
      totals: { total: money(returnsTotal), count: returnsCount },
      truncated: list.truncated,
      footnotes: [
        `Ratio devoluciones / compras: ${ratio}%.`,
        ...(list.truncated ? ['Resultado truncado a 1000 filas.'] : []),
      ],
    };
  }
}

@Injectable()
export class PurchasesBySupplierHandler implements PurchasingReportHandler {
  readonly id = 'purchases-by-supplier';
  readonly title = 'Compras a un proveedor';
  readonly description = 'Historial de facturas de un proveedor en el período.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: PurchasingReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      supplierId: this.q.requireUuid(params, 'supplierId'),
    };
  }

  async run(ctx: PurchasingReportHandlerContext): Promise<PurchasingReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const [byMonth, detail, summary, supplierName] = await Promise.all([
      this.q.supplierPurchasesByMonth(ctx.companyId, range, params.supplierId),
      this.q.listPurchaseDetail(ctx.companyId, range, { supplierId: params.supplierId }),
      this.q.purchasesSummary(ctx.companyId, range, { supplierId: params.supplierId }),
      this.q.getSupplierName(ctx.companyId, params.supplierId),
    ]);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params: { ...params, supplierName: supplierName ?? params.supplierId },
      summary: {
        supplierName: supplierName ?? params.supplierId,
        totalPurchases: money(summary.total),
        purchaseCount: summary.count,
        avgTicket: money(summary.avgTicket),
        taxAmount: money(summary.taxAmount),
      },
      series: [
        {
          id: 'purchases-by-month',
          label: 'Compras por mes',
          chart: 'bar',
          points: byMonth.map((d) => ({ x: d.month, y: money(d.total) })),
        },
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha' },
        { key: 'documentNumber', label: 'Documento' },
        { key: 'paymentMethod', label: 'Pago' },
        { key: 'subtotal', label: 'Neto', align: 'right' },
        { key: 'taxAmount', label: 'IVA', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
      ],
      rows: detail.rows.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        documentNumber: t.documentNumber ?? t.documentFolio ?? '—',
        paymentMethod: t.paymentMethod,
        subtotal: money(Number(t.subtotal) || 0),
        taxAmount: money(Number(t.taxAmount) || 0),
        total: money(Number(t.total) || 0),
      })),
      totals: {
        total: money(summary.total),
        subtotal: money(summary.subtotal),
        taxAmount: money(summary.taxAmount),
        count: summary.count,
      },
      truncated: detail.truncated,
      footnotes: detail.truncated ? ['Resultado truncado a 1000 filas.'] : undefined,
    };
  }
}

@Injectable()
export class PurchasesByPaymentMethodHandler implements PurchasingReportHandler {
  readonly id = 'purchases-by-payment-method';
  readonly title = 'Mix de medios de pago a proveedor';
  readonly description =
    'Distribución de pagos a proveedor (SUPPLIER_PAYMENT) por medio de pago.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: PurchasingReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      supplierId: this.q.optionalUuid(params, 'supplierId'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: PurchasingReportHandlerContext): Promise<PurchasingReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      supplierId: params.supplierId,
      storageIds: params.storageIds,
    };
    const mix = await this.q.paymentMix(ctx.companyId, range, filter);
    const total = mix.reduce((s, m) => s + m.total, 0);
    const count = mix.reduce((s, m) => s + m.count, 0);

    const summaryNums = {
      totalPayments: money(total),
      paymentCount: count,
      methods: mix.length,
    };

    let summaryDelta: PurchasingReportRunResult['summaryDelta'];
    let prevByMethod = new Map<string, number>();
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const prevMix = await this.q.paymentMix(ctx.companyId, prevRange, filter);
      prevByMethod = new Map(prevMix.map((m) => [m.paymentMethod, m.total]));
      summaryDelta = buildSummaryDelta(summaryNums, {
        totalPayments: money(prevMix.reduce((s, m) => s + m.total, 0)),
        paymentCount: prevMix.reduce((s, m) => s + m.count, 0),
        methods: prevMix.length,
      });
    }

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: summaryNums,
      summaryDelta,
      series: [
        {
          id: 'payment-mix',
          label: 'Mix de medios de pago',
          chart: 'pie',
          points: mix.map((m) => ({ x: m.paymentMethod, y: money(m.total) })),
        },
        {
          id: 'payment-bar',
          label:
            prevByMethod.size > 0
              ? 'Montos por medio (actual vs comparación)'
              : 'Montos por medio',
          chart: 'bar',
          points: mix.map((m) => ({
            x: m.paymentMethod,
            y: money(m.total),
            ...(prevByMethod.size > 0
              ? { y2: money(prevByMethod.get(m.paymentMethod) ?? 0) }
              : {}),
          })),
        },
      ],
      columns: [
        { key: 'paymentMethod', label: 'Medio de pago' },
        { key: 'count', label: 'Pagos', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'sharePct', label: '%', align: 'right' },
      ],
      rows: mix.map((m) => ({
        paymentMethod: m.paymentMethod,
        count: m.count,
        total: money(m.total),
        sharePct: total > 0 ? Math.round((m.total / total) * 1000) / 10 : 0,
      })),
      totals: { total: money(total), count },
      footnotes: [
        'Solo pagos confirmados (SUPPLIER_PAYMENT CONFIRMED). Excluye cuotas programadas en borrador.',
        ...(cmp ? [`Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`] : []),
      ],
    };
  }
}
