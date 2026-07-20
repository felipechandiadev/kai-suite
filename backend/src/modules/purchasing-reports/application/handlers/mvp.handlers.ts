import { Injectable } from '@nestjs/common';
import {
  PurchasingReportHandler,
  PurchasingReportHandlerContext,
  PurchasingReportRunResult,
} from '../../domain/purchasing-report.types';
import { PurchasingReportsQueryService } from '../purchasing-reports-query.service';

function nowIso() {
  return new Date().toISOString();
}

function money(n: number) {
  return Math.round(n * 100) / 100;
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
    const [summary, byDay] = await Promise.all([
      this.q.purchasesSummary(ctx.companyId, range, filter),
      this.q.purchasesByDay(ctx.companyId, range, filter),
    ]);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        totalPurchases: money(summary.total),
        subtotalNet: money(summary.subtotal),
        taxAmount: money(summary.taxAmount),
        purchaseCount: summary.count,
        avgTicket: money(summary.avgTicket),
      },
      series: [
        {
          id: 'purchases-by-day',
          label: 'Compras por día',
          chart: 'area',
          points: byDay.map((d) => ({ x: d.day, y: money(d.total) })),
        },
        {
          id: 'avg-ticket-by-day',
          label: 'Ticket promedio por día',
          chart: 'bar',
          points: byDay.map((d) => ({ x: d.day, y: money(d.avgTicket) })),
        },
      ],
      columns: [
        { key: 'day', label: 'Día' },
        { key: 'count', label: 'Facturas', align: 'right' },
        { key: 'subtotal', label: 'Neto', align: 'right' },
        { key: 'taxAmount', label: 'IVA', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'avgTicket', label: 'Ticket prom.', align: 'right' },
      ],
      rows: byDay.map((d) => ({
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
    const [detail, byDay, summary] = await Promise.all([
      this.q.listPurchaseDetail(ctx.companyId, range, filter),
      this.q.purchasesByDay(ctx.companyId, range, filter),
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
          id: 'purchases-by-day',
          label: 'Montos por día',
          chart: 'bar',
          points: byDay.map((d) => ({ x: d.day, y: money(d.total) })),
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

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        quantity: money(qty),
        amount: money(amount),
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
          label: 'Costo por día',
          chart: 'bar',
          points: byDay.map((d) => ({ x: d.day, y: money(d.amount) })),
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
      footnotes: lines.truncated ? ['Resultado truncado a 1000 filas.'] : undefined,
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

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        totalPayments: money(total),
        paymentCount: count,
        methods: mix.length,
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
      ],
    };
  }
}
