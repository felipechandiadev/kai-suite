import { BadRequestException, Injectable } from '@nestjs/common';
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

@Injectable()
export class InventoryPeriodCompareHandler implements InventoryReportHandler {
  readonly id = 'inventory-period-compare';
  readonly title = 'Comparativo de período (inventario)';
  readonly description =
    'Movimientos de stock del período vs período anterior o mismo lapso del año pasado.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: InventoryReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    let compareWith = parseCompareWith(params.compareWith);
    if (compareWith === 'none') compareWith = 'previousPeriod';
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      stockUnitIds: this.q.requireUuidList(params, 'stockUnitIds'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      productId: this.q.optionalUuid(params, 'productId'),
      granularity: resolveGranularity(
        params.granularity,
        range.dateFrom,
        range.dateTo,
      ),
      compareWith,
    };
  }

  async run(
    ctx: InventoryReportHandlerContext,
  ): Promise<InventoryReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = {
      stockUnitIds: params.stockUnitIds,
      storageIds: params.storageIds,
      productId: params.productId,
    };
    const grain = params.granularity;
    const cmp = compareDateRange(
      params.dateFrom,
      params.dateTo,
      params.compareWith,
    );
    if (!cmp) {
      throw new BadRequestException('compareWith es requerido');
    }
    const prevRange = this.q.parseDateRange(cmp);

    const [current, previous] = await Promise.all([
      this.q.movementByBucket(ctx.companyId, range, filter, grain),
      this.q.movementByBucket(ctx.companyId, prevRange, filter, grain),
    ]);

    const summaryNums = {
      qtyIn: current.totals.qtyIn,
      qtyOut: current.totals.qtyOut,
      qtyNet: current.totals.qtyNet,
      valorMovido: current.totals.valorMovido,
      lineEvents: current.totals.lineEvents,
    };
    const prevNums = {
      qtyIn: previous.totals.qtyIn,
      qtyOut: previous.totals.qtyOut,
      qtyNet: previous.totals.qtyNet,
      valorMovido: previous.totals.valorMovido,
      lineEvents: previous.totals.lineEvents,
    };
    const summaryDelta = buildSummaryDelta(summaryNums, prevNums);

    const grainLabel = bucketGrainLabel(grain);
    const multiUnit = params.stockUnitIds.length > 1;

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params: {
        ...params,
        compareFrom: cmp.dateFrom,
        compareTo: cmp.dateTo,
      },
      summary: summaryNums,
      summaryDelta,
      series: [
        {
          id: 'movement-net-compare',
          label: `Neto de movimientos por ${grainLabel} (actual vs comparación)`,
          chart: 'line',
          points: mergeBucketPoints(
            current.buckets.map((b) => ({ x: b.bucket, y: b.qtyNet })),
            previous.buckets.map((b) => ({ x: b.bucket, y: b.qtyNet })),
          ),
        },
        {
          id: 'movement-valor-compare',
          label: `Valor movido por ${grainLabel} (actual vs comparación)`,
          chart: 'area',
          points: mergeBucketPoints(
            current.buckets.map((b) => ({ x: b.bucket, y: b.valorMovido })),
            previous.buckets.map((b) => ({ x: b.bucket, y: b.valorMovido })),
          ),
        },
      ],
      columns: [
        { key: 'metric', label: 'Métrica' },
        { key: 'current', label: 'Actual', align: 'right' },
        { key: 'previous', label: 'Comparación', align: 'right' },
        { key: 'deltaPct', label: 'Δ %', align: 'right' },
      ],
      rows: Object.keys(summaryNums).map((key) => {
        const d = summaryDelta[key];
        return {
          metric: key,
          current: d.current,
          previous: d.previous,
          deltaPct: d.deltaPct,
        };
      }),
      footnotes: [
        `Período actual: ${params.dateFrom} → ${params.dateTo}. Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`,
        `Bucket de ${bucketColumnLabel(grain).toLowerCase()}; series alineadas por posición (mismo largo de período).`,
        'Valor movido = |cantidad| × costo unitario de la línea; sin costo no suma al monto.',
        ...(current.totals.lineasSinCosto > 0
          ? [
              `${current.totals.lineasSinCosto} línea(s) sin costo unitario en el período actual.`,
            ]
          : []),
        ...(multiUnit
          ? [
              'Seleccionaste más de una unidad de stock: las cantidades se suman entre unidades. Elegí una sola unidad para lecturas exactas.',
            ]
          : []),
        ...(current.buckets.length === 0 && previous.buckets.length === 0
          ? ['Sin movimientos en el período / filtros.']
          : []),
      ],
    };
  }
}
