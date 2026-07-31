import { Injectable } from '@nestjs/common';
import {
  SalesReportHandler,
  SalesReportHandlerContext,
  SalesReportRunResult,
  buildSummaryDelta,
  compareDateRange,
  parseCompareWith,
  resolveGranularity,
} from '../../domain/sales-report.types';
import { SalesReportsQueryService } from '../sales-reports-query.service';

function nowIso() {
  return new Date().toISOString();
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function mergeBucketPoints(
  current: Array<{ day: string; total: number }>,
  previous: Array<{ day: string; total: number }>,
): Array<{ x: string; y: number; y2?: number }> {
  const prevMap = new Map(previous.map((p, i) => [String(i), p.total]));
  // Align by index for comparable period lengths (same bucket count order)
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
  void prevMap;
  return points;
}

@Injectable()
export class SalesByPeriodHandler implements SalesReportHandler {
  readonly id = 'sales-by-period';
  readonly title = 'Resumen de ventas';
  readonly description = 'Totales, ticket promedio y evolución del período.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: this.q.optionalUuid(params, 'branchId'),
      pointOfSaleIds: this.q.optionalUuidList(params, 'pointOfSaleIds'),
      granularity: resolveGranularity(params.granularity, range.dateFrom, range.dateTo),
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      branchId: params.branchId,
      pointOfSaleIds: params.pointOfSaleIds,
    };
    const grain = params.granularity;
    const [summary, byBucket, margin] = await Promise.all([
      this.q.salesSummary(ctx.companyId, range, filter),
      this.q.salesByBucket(ctx.companyId, range, filter, grain),
      this.q.marginForLines(ctx.companyId, range, {
        branchId: params.branchId,
        pointOfSaleIds: params.pointOfSaleIds,
      }),
    ]);

    const summaryNums = {
      totalSales: money(summary.total),
      ticketCount: summary.count,
      avgTicket: money(summary.avgTicket),
      grossMargin: money(margin.margin),
      marginCoveragePct: margin.quality.coveragePct,
    };

    let summaryDelta: SalesReportRunResult['summaryDelta'];
    let previousBuckets: Array<{ day: string; total: number }> = [];
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const [prevSummary, prevBuckets, prevMargin] = await Promise.all([
        this.q.salesSummary(ctx.companyId, prevRange, filter),
        this.q.salesByBucket(ctx.companyId, prevRange, filter, grain),
        this.q.marginForLines(ctx.companyId, prevRange, {
          branchId: params.branchId,
          pointOfSaleIds: params.pointOfSaleIds,
        }),
      ]);
      previousBuckets = prevBuckets;
      summaryDelta = buildSummaryDelta(summaryNums, {
        totalSales: money(prevSummary.total),
        ticketCount: prevSummary.count,
        avgTicket: money(prevSummary.avgTicket),
        grossMargin: money(prevMargin.margin),
        marginCoveragePct: prevMargin.quality.coveragePct,
      });
    }

    const grainLabel =
      grain === 'month' ? 'mes' : grain === 'week' ? 'semana' : 'día';
    const salesPoints =
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
          id: 'sales-by-bucket',
          label:
            previousBuckets.length > 0
              ? `Ventas por ${grainLabel} (actual vs comparación)`
              : `Ventas por ${grainLabel}`,
          chart: 'area',
          points: salesPoints,
        },
        {
          id: 'avg-ticket-by-bucket',
          label: `Ticket promedio por ${grainLabel}`,
          chart: 'bar',
          points: byBucket.map((d) => ({ x: d.day, y: money(d.avgTicket) })),
        },
      ],
      columns: [
        { key: 'day', label: grain === 'month' ? 'Mes' : grain === 'week' ? 'Semana' : 'Día' },
        { key: 'count', label: 'Tickets', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'avgTicket', label: 'Ticket prom.', align: 'right' },
      ],
      rows: byBucket.map((d) => ({
        day: d.day,
        count: d.count,
        total: money(d.total),
        avgTicket: money(d.avgTicket),
      })),
      totals: {
        total: money(summary.total),
        count: summary.count,
        margin: money(margin.margin),
      },
      marginQuality: margin.quality,
      footnotes: [this.q.marginFootnote(margin.quality)],
    };
  }
}

@Injectable()
export class SalesDetailHandler implements SalesReportHandler {
  readonly id = 'sales-detail';
  readonly title = 'Detalle de ventas';
  readonly description = 'Listado de ventas del período con evolución diaria.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: this.q.optionalUuid(params, 'branchId'),
      pointOfSaleIds: this.q.optionalUuidList(params, 'pointOfSaleIds'),
      customerId: this.q.optionalUuid(params, 'customerId'),
      paymentMethod:
        typeof params.paymentMethod === 'string' && params.paymentMethod
          ? params.paymentMethod
          : undefined,
      granularity: resolveGranularity(params.granularity, range.dateFrom, range.dateTo),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      branchId: params.branchId,
      pointOfSaleIds: params.pointOfSaleIds,
      customerId: params.customerId,
      paymentMethod: params.paymentMethod,
    };
    const grain = params.granularity;
    const [detail, byBucket, summary] = await Promise.all([
      this.q.listSalesDetail(ctx.companyId, range, filter),
      this.q.salesByBucket(ctx.companyId, range, filter, grain),
      this.q.salesSummary(ctx.companyId, range, filter),
    ]);

    const grainLabel =
      grain === 'month' ? 'mes' : grain === 'week' ? 'semana' : 'día';

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        totalSales: money(summary.total),
        ticketCount: summary.count,
        avgTicket: money(summary.avgTicket),
      },
      series: [
        {
          id: 'sales-by-bucket',
          label: `Montos por ${grainLabel}`,
          chart: 'bar',
          points: byBucket.map((d) => ({ x: d.day, y: money(d.total) })),
        },
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha' },
        { key: 'id', label: 'ID' },
        { key: 'paymentMethod', label: 'Pago' },
        { key: 'status', label: 'Estado' },
        { key: 'total', label: 'Total', align: 'right' },
      ],
      rows: detail.rows.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        paymentMethod: t.paymentMethod,
        status: t.status,
        total: money(Number(t.total) || 0),
        customerId: t.customerId ?? null,
      })),
      totals: { total: money(summary.total), count: summary.count },
      truncated: detail.truncated,
      footnotes: detail.truncated
        ? ['Resultado truncado a 1000 filas. Acotá el rango o filtros.']
        : undefined,
    };
  }
}

@Injectable()
export class SalesByProductHandler implements SalesReportHandler {
  readonly id = 'sales-by-product';
  readonly title = 'Ventas de un producto';
  readonly description = 'Unidades, monto y margen de un producto en el período.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      productId: this.q.requireUuid(params, 'productId'),
      branchId: this.q.optionalUuid(params, 'branchId'),
      pointOfSaleIds: this.q.optionalUuidList(params, 'pointOfSaleIds'),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      branchId: params.branchId,
      pointOfSaleIds: params.pointOfSaleIds,
    };
    const [byDay, lines, margin] = await Promise.all([
      this.q.productSalesByDay(ctx.companyId, range, params.productId, filter),
      this.q.productSalesLines(ctx.companyId, range, params.productId, filter),
      this.q.marginForLines(ctx.companyId, range, {
        productId: params.productId,
        ...filter,
      }),
    ]);

    const qty = byDay.reduce((s, d) => s + d.qty, 0);
    const amount = byDay.reduce((s, d) => s + d.amount, 0);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        quantity: money(qty),
        amount: money(amount),
        grossMargin: money(margin.margin),
        marginCoveragePct: margin.quality.coveragePct,
      },
      series: [
        {
          id: 'qty-by-day',
          label: 'Cantidad por día',
          chart: 'line',
          points: byDay.map((d) => ({ x: d.day, y: money(d.qty), y2: money(d.amount) })),
        },
        {
          id: 'amount-by-day',
          label: 'Monto por día',
          chart: 'bar',
          points: byDay.map((d) => ({ x: d.day, y: money(d.amount) })),
        },
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha' },
        { key: 'productSku', label: 'SKU' },
        { key: 'quantity', label: 'Cant.', align: 'right' },
        { key: 'unitPrice', label: 'P. unit.', align: 'right' },
        { key: 'subtotal', label: 'Subtotal', align: 'right' },
        { key: 'margin', label: 'Margen', align: 'right' },
      ],
      rows: lines.rows,
      totals: {
        quantity: money(qty),
        amount: money(amount),
        margin: money(margin.margin),
      },
      truncated: lines.truncated,
      marginQuality: margin.quality,
      footnotes: [
        this.q.marginFootnote(margin.quality),
        ...(lines.truncated ? ['Resultado truncado a 1000 filas.'] : []),
      ],
    };
  }
}

@Injectable()
export class CustomerReturnsHandler implements SalesReportHandler {
  readonly id = 'customer-returns';
  readonly title = 'Devoluciones de cliente';
  readonly description = 'Devoluciones en el período, con evolución diaria.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      customerId: this.q.optionalUuid(params, 'customerId'),
      productId: this.q.optionalUuid(params, 'productId'),
      pointOfSaleIds: this.q.optionalUuidList(params, 'pointOfSaleIds'),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      customerId: params.customerId,
      productId: params.productId,
      pointOfSaleIds: params.pointOfSaleIds,
    };
    const [byDay, list, salesSummary] = await Promise.all([
      this.q.returnsByDay(ctx.companyId, range, filter),
      this.q.listReturns(ctx.companyId, range, filter),
      this.q.salesSummary(ctx.companyId, range, {
        customerId: params.customerId,
        pointOfSaleIds: params.pointOfSaleIds,
      }),
    ]);
    const returnsTotal = byDay.reduce((s, d) => s + d.total, 0);
    const returnsCount = byDay.reduce((s, d) => s + d.count, 0);
    const ratio =
      salesSummary.total > 0
        ? Math.round((returnsTotal / salesSummary.total) * 1000) / 10
        : 0;

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        returnsTotal: money(returnsTotal),
        returnsCount,
        salesTotal: money(salesSummary.total),
        returnsVsSalesPct: ratio,
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
        { key: 'id', label: 'ID' },
        { key: 'productName', label: 'Producto' },
        { key: 'quantity', label: 'Cant.', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
      ],
      rows: list.rows,
      totals: { total: money(returnsTotal), count: returnsCount },
      truncated: list.truncated,
      footnotes: [
        `Ratio devoluciones / ventas: ${ratio}%.`,
        ...(list.truncated ? ['Resultado truncado a 1000 filas.'] : []),
      ],
    };
  }
}

@Injectable()
export class CustomerPurchasesHandler implements SalesReportHandler {
  readonly id = 'customer-purchases';
  readonly title = 'Compras de un cliente';
  readonly description = 'Historial y margen de compras de un cliente.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      customerId: this.q.requireUuid(params, 'customerId'),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const [byMonth, detail, summary, margin, customerName] = await Promise.all([
      this.q.customerPurchasesByMonth(ctx.companyId, range, params.customerId),
      this.q.listSalesDetail(ctx.companyId, range, { customerId: params.customerId }),
      this.q.salesSummary(ctx.companyId, range, { customerId: params.customerId }),
      this.q.marginForLines(ctx.companyId, range, { customerId: params.customerId }),
      this.q.getCustomerName(ctx.companyId, params.customerId),
    ]);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params: { ...params, customerName: customerName ?? params.customerId },
      summary: {
        customerName: customerName ?? params.customerId,
        totalSales: money(summary.total),
        ticketCount: summary.count,
        avgTicket: money(summary.avgTicket),
        grossMargin: money(margin.margin),
        marginCoveragePct: margin.quality.coveragePct,
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
        { key: 'id', label: 'ID' },
        { key: 'paymentMethod', label: 'Pago' },
        { key: 'total', label: 'Total', align: 'right' },
      ],
      rows: detail.rows.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        paymentMethod: t.paymentMethod,
        total: money(Number(t.total) || 0),
      })),
      totals: {
        total: money(summary.total),
        count: summary.count,
        margin: money(margin.margin),
      },
      truncated: detail.truncated,
      marginQuality: margin.quality,
      footnotes: [this.q.marginFootnote(margin.quality)],
    };
  }
}

@Injectable()
export class CashSessionCloseHandler implements SalesReportHandler {
  readonly id = 'cash-session-close';
  readonly title = 'Cierre de sesión de caja';
  readonly description = 'Totales y mix de medios de pago de una sesión.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const cashSessionId = this.q.optionalUuid(params, 'cashSessionId');
    if (cashSessionId) {
      return { cashSessionId };
    }
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      pointOfSaleIds: this.q.optionalUuidList(params, 'pointOfSaleIds'),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);

    if (params.cashSessionId) {
      const session = await this.q.getCashSession(ctx.companyId, params.cashSessionId);
      const mix = await this.q.paymentMixForSession(ctx.companyId, params.cashSessionId);
      const total = mix.reduce((s, m) => s + m.total, 0);
      const count = mix.reduce((s, m) => s + m.count, 0);
      return {
        reportId: this.id,
        title: this.title,
        generatedAt: nowIso(),
        params: {
          ...params,
          sessionStatus: session?.status ?? null,
          openedAt: session?.openedAt ?? null,
          closedAt: session?.closedAt ?? null,
        },
        summary: {
          totalSales: money(total),
          ticketCount: count,
          sessionStatus: session?.status ?? '—',
        },
        series: [
          {
            id: 'payment-mix',
            label: 'Mix de medios de pago',
            chart: 'pie',
            points: mix.map((m) => ({ x: m.paymentMethod, y: money(m.total) })),
          },
        ],
        columns: [
          { key: 'paymentMethod', label: 'Medio de pago' },
          { key: 'count', label: 'Tickets', align: 'right' },
          { key: 'total', label: 'Total', align: 'right' },
        ],
        rows: mix.map((m) => ({
          paymentMethod: m.paymentMethod,
          count: m.count,
          total: money(m.total),
        })),
        totals: { total: money(total), count },
      };
    }

    const range = this.q.parseDateRange(params);
    const filter = { pointOfSaleIds: params.pointOfSaleIds as string[] | undefined };
    const [mix, summary, byDay] = await Promise.all([
      this.q.paymentMix(ctx.companyId, range, filter),
      this.q.salesSummary(ctx.companyId, range, filter),
      this.q.salesByDay(ctx.companyId, range, filter),
    ]);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        totalSales: money(summary.total),
        ticketCount: summary.count,
        avgTicket: money(summary.avgTicket),
      },
      series: [
        {
          id: 'payment-mix',
          label: 'Mix de medios de pago',
          chart: 'pie',
          points: mix.map((m) => ({ x: m.paymentMethod, y: money(m.total) })),
        },
        {
          id: 'sales-by-day',
          label: 'Ventas por día',
          chart: 'bar',
          points: byDay.map((d) => ({ x: d.day, y: money(d.total) })),
        },
      ],
      columns: [
        { key: 'paymentMethod', label: 'Medio de pago' },
        { key: 'count', label: 'Tickets', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
      ],
      rows: mix.map((m) => ({
        paymentMethod: m.paymentMethod,
        count: m.count,
        total: money(m.total),
      })),
      totals: { total: money(summary.total), count: summary.count },
      footnotes: [
        'Sin sesión específica: se reporta el mix de ventas del rango/POS indicado.',
      ],
    };
  }
}
