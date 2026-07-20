import { Injectable } from '@nestjs/common';
import {
  InventoryReportHandler,
  InventoryReportHandlerContext,
  InventoryReportRunResult,
} from '../../domain/inventory-report.types';
import { InventoryReportsQueryService } from '../inventory-reports-query.service';

function nowIso() {
  return new Date().toISOString();
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
  readonly description = 'Cantidades y valoración PMP agregadas por bodega.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: InventoryReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    return {
      productId: this.q.optionalUuid(params, 'productId'),
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const { rows } = await this.q.stockByStorageRows(ctx.companyId, {
      productId: params.productId,
    });

    const qtyTotal = rows.reduce((s, r) => s + r.qty, 0);
    const valorTotal = rows.reduce((s, r) => s + r.valorConPmp, 0);
    const sinPmp = rows.reduce((s, r) => s + r.lineasSinPmp, 0);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        storageCount: rows.length,
        qtyTotal: qty(qtyTotal),
        valorConPmp: money(valorTotal),
        lineasSinPmp: sinPmp,
      },
      series: [
        {
          id: 'valor-by-storage',
          label: 'Valor PMP por almacén',
          chart: 'bar',
          points: rows.map((r) => ({ x: r.storageName, y: money(r.valorConPmp) })),
        },
        {
          id: 'qty-by-storage',
          label: 'Cantidad por almacén',
          chart: 'bar',
          points: rows.map((r) => ({ x: r.storageName, y: qty(r.qty) })),
        },
      ],
      columns: [
        { key: 'storageName', label: 'Almacén' },
        { key: 'skuCount', label: 'SKUs', align: 'right' },
        { key: 'qty', label: 'Cant.', align: 'right' },
        { key: 'valorConPmp', label: 'Valor PMP', align: 'right' },
        { key: 'lineasSinPmp', label: 'Sin PMP', align: 'right' },
      ],
      rows: rows.map((r) => ({
        storageName: r.storageName,
        skuCount: r.skuCount,
        qty: qty(r.qty),
        valorConPmp: money(r.valorConPmp),
        lineasSinPmp: r.lineasSinPmp,
      })),
      totals: {
        skuCount: rows.reduce((s, r) => s + r.skuCount, 0),
        qty: qty(qtyTotal),
        valorConPmp: money(valorTotal),
        lineasSinPmp: sinPmp,
      },
      footnotes: [
        'Valoración a PMP; líneas sin PMP no suman al valor.',
        'Cantidad = stock físico (no disponible ni reservado).',
      ],
    };
  }
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
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const data = await this.q.listTransfers(ctx.companyId, range, {
      storageIds: params.storageIds,
      productId: params.productId,
    });

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        transferCount: data.transferCount,
        qtyMoved: qty(data.qtyMoved),
      },
      series: [
        {
          id: 'transfers-by-day',
          label: 'Transferencias por día',
          chart: 'bar',
          points: data.byDay.map((d) => ({ x: d.day, y: d.count })),
        },
        {
          id: 'transfer-qty-by-day',
          label: 'Cantidad transferida por día',
          chart: 'area',
          points: data.byDay.map((d) => ({ x: d.day, y: qty(d.qty) })),
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
    };
  }

  async run(ctx: InventoryReportHandlerContext): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const data = await this.q.listAdjustments(ctx.companyId, range, {
      storageIds: params.storageIds,
      productId: params.productId,
    });

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        count: data.count,
        qtyIn: qty(data.qtyIn),
        qtyOut: qty(data.qtyOut),
        qtyNet: qty(data.qtyNet),
      },
      series: [
        {
          id: 'adjustments-net-by-day',
          label: 'Neto de ajustes por día',
          chart: 'bar',
          points: data.byDay.map((d) => ({ x: d.day, y: qty(d.qtyNet) })),
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
        ...(data.truncated ? ['Resultado truncado a 1000 filas.'] : []),
        ...(data.count === 0 ? ['Sin ajustes en el período / filtros.'] : []),
      ],
    };
  }
}
