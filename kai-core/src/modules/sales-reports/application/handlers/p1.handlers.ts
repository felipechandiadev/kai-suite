import { Injectable } from '@nestjs/common';
import {
  SalesReportHandler,
  SalesReportHandlerContext,
  SalesReportRunResult,
  buildSummaryDelta,
  compareDateRange,
  parseCompareWith,
} from '../../domain/sales-report.types';
import { SalesReportsQueryService } from '../sales-reports-query.service';

function nowIso() {
  return new Date().toISOString();
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class TopProductsHandler implements SalesReportHandler {
  readonly id = 'top-products';
  readonly title = 'Productos más vendidos';
  readonly description = 'Ranking de productos por monto en el período.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    const topN =
      typeof params.topN === 'number'
        ? params.topN
        : typeof params.topN === 'string'
          ? Number(params.topN)
          : 20;
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      topN: Number.isFinite(topN) ? topN : 20,
      branchId: this.q.optionalUuid(params, 'branchId'),
      pointOfSaleIds: this.q.optionalUuidList(params, 'pointOfSaleIds'),
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
    const rows = await this.q.topProducts(ctx.companyId, range, params.topN, filter);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
    const totalMargin = rows.reduce((s, r) => s + r.margin, 0);

    const summaryNums = {
      products: rows.length,
      totalAmount: money(totalAmount),
      grossMargin: money(totalMargin),
    };

    let summaryDelta: SalesReportRunResult['summaryDelta'];
    let prevByProduct = new Map<string, number>();
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const prevRows = await this.q.topProducts(
        ctx.companyId,
        prevRange,
        params.topN,
        filter,
      );
      prevByProduct = new Map(prevRows.map((r) => [String(r.productId), r.amount]));
      const prevAmount = prevRows.reduce((s, r) => s + r.amount, 0);
      const prevMargin = prevRows.reduce((s, r) => s + r.margin, 0);
      summaryDelta = buildSummaryDelta(summaryNums, {
        products: prevRows.length,
        totalAmount: money(prevAmount),
        grossMargin: money(prevMargin),
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
          id: 'top-by-amount',
          label:
            prevByProduct.size > 0
              ? 'Top por monto (actual vs comparación)'
              : 'Top por monto',
          chart: 'bar',
          points: rows.map((r) => ({
            x: String(r.productSku || r.productName || r.productId || '—').slice(0, 24),
            y: money(r.amount),
            ...(prevByProduct.size > 0
              ? { y2: money(prevByProduct.get(String(r.productId)) ?? 0) }
              : {}),
          })),
        },
      ],
      columns: [
        { key: 'productSku', label: 'SKU' },
        { key: 'productName', label: 'Producto' },
        { key: 'qty', label: 'Cant.', align: 'right' },
        { key: 'amount', label: 'Monto', align: 'right' },
        { key: 'margin', label: 'Margen', align: 'right' },
      ],
      rows: rows.map((r) => ({
        ...r,
        amount: money(r.amount),
        margin: money(r.margin),
        qty: money(r.qty),
      })),
      totals: { amount: money(totalAmount), margin: money(totalMargin) },
      footnotes: [
        'Margen solo suma líneas con unitCost > 0 (sin recalcular costo actual).',
        ...(cmp
          ? [`Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`]
          : []),
      ],
    };
  }
}

@Injectable()
export class SalesByPaymentMethodHandler implements SalesReportHandler {
  readonly id = 'sales-by-payment-method';
  readonly title = 'Mix de medios de pago';
  readonly description = 'Distribución de ventas por medio de pago.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      pointOfSaleIds: this.q.optionalUuidList(params, 'pointOfSaleIds'),
      branchId: this.q.optionalUuid(params, 'branchId'),
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      pointOfSaleIds: params.pointOfSaleIds,
      branchId: params.branchId,
    };
    const mix = await this.q.paymentMix(ctx.companyId, range, filter);
    const total = mix.reduce((s, m) => s + m.total, 0);

    const summaryNums = {
      totalSales: money(total),
      methods: mix.length,
    };

    let summaryDelta: SalesReportRunResult['summaryDelta'];
    let prevByMethod = new Map<string, number>();
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const prevMix = await this.q.paymentMix(ctx.companyId, prevRange, filter);
      prevByMethod = new Map(prevMix.map((m) => [m.paymentMethod, m.total]));
      const prevTotal = prevMix.reduce((s, m) => s + m.total, 0);
      summaryDelta = buildSummaryDelta(summaryNums, {
        totalSales: money(prevTotal),
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
          label: 'Mix de pagos',
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
        { key: 'paymentMethod', label: 'Medio' },
        { key: 'count', label: 'Tickets', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'sharePct', label: '%', align: 'right' },
      ],
      rows: mix.map((m) => ({
        paymentMethod: m.paymentMethod,
        count: m.count,
        total: money(m.total),
        sharePct: total > 0 ? Math.round((m.total / total) * 1000) / 10 : 0,
      })),
      totals: { total: money(total) },
      footnotes: cmp
        ? [`Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`]
        : undefined,
    };
  }
}

@Injectable()
export class SalesByPosHandler implements SalesReportHandler {
  readonly id = 'sales-by-pos';
  readonly title = 'Comparativo por punto de venta';
  readonly description = 'Ventas agregadas por POS en el período.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: this.q.optionalUuid(params, 'branchId'),
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = { branchId: params.branchId };
    const rows = await this.q.salesByPos(ctx.companyId, range, filter);
    const total = rows.reduce((s, r) => s + r.total, 0);

    const summaryNums = {
      totalSales: money(total),
      posCount: rows.length,
    };

    let summaryDelta: SalesReportRunResult['summaryDelta'];
    let prevByPos = new Map<string, number>();
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const prevRows = await this.q.salesByPos(ctx.companyId, prevRange, filter);
      prevByPos = new Map(
        prevRows.map((r) => [String(r.pointOfSaleId ?? ''), r.total]),
      );
      const prevTotal = prevRows.reduce((s, r) => s + r.total, 0);
      summaryDelta = buildSummaryDelta(summaryNums, {
        totalSales: money(prevTotal),
        posCount: prevRows.length,
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
          id: 'by-pos',
          label:
            prevByPos.size > 0
              ? 'Ventas por POS (actual vs comparación)'
              : 'Ventas por POS',
          chart: 'bar',
          points: rows.map((r) => ({
            x: String(r.pointOfSaleId ?? 'Sin POS').slice(0, 8),
            y: money(r.total),
            ...(prevByPos.size > 0
              ? {
                  y2: money(prevByPos.get(String(r.pointOfSaleId ?? '')) ?? 0),
                }
              : {}),
          })),
        },
      ],
      columns: [
        { key: 'pointOfSaleId', label: 'POS' },
        { key: 'count', label: 'Tickets', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'avgTicket', label: 'Ticket prom.', align: 'right' },
      ],
      rows: rows.map((r) => ({
        pointOfSaleId: r.pointOfSaleId,
        count: r.count,
        total: money(r.total),
        avgTicket: money(r.avgTicket),
      })),
      totals: { total: money(total) },
      footnotes: cmp
        ? [`Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`]
        : undefined,
    };
  }
}

@Injectable()
export class CreditNotesHandler implements SalesReportHandler {
  readonly id = 'credit-notes';
  readonly title = 'Notas de crédito';
  readonly description = 'NC emitidas a clientes en el período.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      customerId: this.q.optionalUuid(params, 'customerId'),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const data = await this.q.creditNotes(ctx.companyId, range, params.customerId);
    const total = data.rows.reduce((s, r) => s + Number(r.total), 0);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        creditNotes: data.rows.length,
        totalAmount: money(total),
      },
      series: [
        {
          id: 'nc-by-day',
          label: 'NC por día',
          chart: 'bar',
          points: data.byDay.map((d) => ({ x: d.day, y: money(d.total) })),
        },
      ],
      columns: [
        { key: 'createdAt', label: 'Fecha' },
        { key: 'id', label: 'ID' },
        { key: 'customerId', label: 'Cliente' },
        { key: 'status', label: 'Estado' },
        { key: 'total', label: 'Total', align: 'right' },
      ],
      rows: data.rows.map((r) => ({ ...r, total: money(Number(r.total)) })),
      totals: { total: money(total), count: data.rows.length },
      truncated: data.truncated,
    };
  }
}

@Injectable()
export class PromotionRedemptionsHandler implements SalesReportHandler {
  readonly id = 'promotion-redemptions';
  readonly title = 'Uso de promociones';
  readonly description = 'Redenciones de promociones en el período.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      promotionId: this.q.optionalUuid(params, 'promotionId'),
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const data = await this.q.promotionRedemptions(
      ctx.companyId,
      range,
      params.promotionId,
    );

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        redemptions: data.total,
        promotions: data.byPromo.length,
      },
      series: [
        {
          id: 'redemptions-by-day',
          label: 'Redenciones por día',
          chart: 'area',
          points: data.byDay.map((d) => ({ x: d.day, y: d.count })),
        },
        {
          id: 'by-promo',
          label: 'Por promoción',
          chart: 'bar',
          points: data.byPromo.map((p) => ({
            x: String(p.promotionId).slice(0, 8),
            y: p.count,
          })),
        },
      ],
      columns: [
        { key: 'promotionId', label: 'Promoción' },
        { key: 'count', label: 'Usos', align: 'right' },
      ],
      rows: data.byPromo,
      totals: { count: data.total },
    };
  }
}

@Injectable()
export class QuotationsFunnelHandler implements SalesReportHandler {
  readonly id = 'quotations-funnel';
  readonly title = 'Embudo de cotizaciones';
  readonly description = 'Cotizaciones por estado y evolución diaria.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const data = await this.q.quotationsFunnel(ctx.companyId, range);
    const total = data.byStatus.reduce((s, r) => s + r.count, 0);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        quotations: total,
        statuses: data.byStatus.length,
      },
      series: [
        {
          id: 'by-status',
          label: 'Por estado',
          chart: 'pie',
          points: data.byStatus.map((s) => ({ x: s.status, y: s.count })),
        },
        {
          id: 'by-day',
          label: 'Cotizaciones por día',
          chart: 'bar',
          points: data.byDay.map((d) => ({ x: d.day, y: d.count })),
        },
      ],
      columns: [
        { key: 'status', label: 'Estado' },
        { key: 'count', label: 'Cantidad', align: 'right' },
        { key: 'total', label: 'Monto', align: 'right' },
      ],
      rows: data.byStatus.map((r) => ({ ...r, total: money(r.total) })),
      totals: { count: total },
    };
  }
}

@Injectable()
export class BackordersStatusHandler implements SalesReportHandler {
  readonly id = 'backorders-status';
  readonly title = 'Encargos por estado';
  readonly description = 'Backorders / encargos en el período.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const data = await this.q.backordersStatus(ctx.companyId, range);
    const total = data.byStatus.reduce((s, r) => s + r.count, 0);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        backorders: total,
        statuses: data.byStatus.length,
      },
      series: [
        {
          id: 'by-status',
          label: 'Por estado',
          chart: 'pie',
          points: data.byStatus.map((s) => ({ x: s.status, y: s.count })),
        },
        {
          id: 'by-day',
          label: 'Encargos por día',
          chart: 'area',
          points: data.byDay.map((d) => ({ x: d.day, y: d.count })),
        },
      ],
      columns: [
        { key: 'status', label: 'Estado' },
        { key: 'count', label: 'Cantidad', align: 'right' },
        { key: 'total', label: 'Monto', align: 'right' },
      ],
      rows: data.byStatus.map((r) => ({ ...r, total: money(r.total) })),
      totals: { count: total },
    };
  }
}

@Injectable()
export class SalesByCategoryHandler implements SalesReportHandler {
  readonly id = 'sales-by-category';
  readonly title = 'Ventas por categoría';
  readonly description = 'Agregado de ventas por categoría de producto.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: this.q.optionalUuid(params, 'branchId'),
      pointOfSaleIds: this.q.optionalUuidList(params, 'pointOfSaleIds'),
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
    const rows = await this.q.salesByCategory(ctx.companyId, range, filter);
    const total = rows.reduce((s, r) => s + r.amount, 0);

    const summaryNums = {
      categories: rows.length,
      totalAmount: money(total),
    };

    let summaryDelta: SalesReportRunResult['summaryDelta'];
    let prevByCat = new Map<string, number>();
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const prevRows = await this.q.salesByCategory(ctx.companyId, prevRange, filter);
      prevByCat = new Map(
        prevRows.map((r) => [String(r.categoryId ?? ''), r.amount]),
      );
      const prevTotal = prevRows.reduce((s, r) => s + r.amount, 0);
      summaryDelta = buildSummaryDelta(summaryNums, {
        categories: prevRows.length,
        totalAmount: money(prevTotal),
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
          id: 'by-category',
          label:
            prevByCat.size > 0
              ? 'Monto por categoría (actual vs comparación)'
              : 'Monto por categoría',
          chart: 'bar',
          points: rows.map((r) => ({
            x: String(r.categoryId ?? 'Sin categoría').slice(0, 10),
            y: money(r.amount),
            ...(prevByCat.size > 0
              ? { y2: money(prevByCat.get(String(r.categoryId ?? '')) ?? 0) }
              : {}),
          })),
        },
        {
          id: 'share',
          label: 'Participación',
          chart: 'pie',
          points: rows.map((r) => ({
            x: String(r.categoryId ?? 'Sin categoría').slice(0, 10),
            y: money(r.amount),
          })),
        },
      ],
      columns: [
        { key: 'categoryId', label: 'Categoría' },
        { key: 'qty', label: 'Cant.', align: 'right' },
        { key: 'amount', label: 'Monto', align: 'right' },
      ],
      rows: rows.map((r) => ({
        categoryId: r.categoryId,
        qty: money(r.qty),
        amount: money(r.amount),
      })),
      totals: { amount: money(total) },
      footnotes: cmp
        ? [`Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`]
        : undefined,
    };
  }
}
