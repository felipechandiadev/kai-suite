import { BadRequestException, Injectable } from '@nestjs/common';
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
import { bucketLabel, mergeBucketPoints } from './mvp.handlers';

function nowIso() {
  return new Date().toISOString();
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class PurchasesPeriodCompareHandler implements PurchasingReportHandler {
  readonly id = 'purchases-period-compare';
  readonly title = 'Comparativo de período';
  readonly description =
    'Compras del período vs período anterior o mismo lapso del año pasado.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: PurchasingReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    let compareWith = parseCompareWith(params.compareWith);
    if (compareWith === 'none') compareWith = 'previousPeriod';
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      supplierId: this.q.optionalUuid(params, 'supplierId'),
      storageIds: this.q.optionalUuidList(params, 'storageIds'),
      branchId: this.q.optionalUuid(params, 'branchId'),
      granularity: resolveGranularity(params.granularity, range.dateFrom, range.dateTo),
      compareWith,
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
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (!cmp) {
      throw new BadRequestException('compareWith es requerido');
    }
    const prevRange = this.q.parseDateRange(cmp);

    const [summary, byBucket, prevSummary, prevBuckets] = await Promise.all([
      this.q.purchasesSummary(ctx.companyId, range, filter),
      this.q.purchasesByBucket(ctx.companyId, range, filter, grain),
      this.q.purchasesSummary(ctx.companyId, prevRange, filter),
      this.q.purchasesByBucket(ctx.companyId, prevRange, filter, grain),
    ]);

    const summaryNums = {
      totalPurchases: money(summary.total),
      subtotalNet: money(summary.subtotal),
      taxAmount: money(summary.taxAmount),
      purchaseCount: summary.count,
      avgTicket: money(summary.avgTicket),
    };
    const prevNums = {
      totalPurchases: money(prevSummary.total),
      subtotalNet: money(prevSummary.subtotal),
      taxAmount: money(prevSummary.taxAmount),
      purchaseCount: prevSummary.count,
      avgTicket: money(prevSummary.avgTicket),
    };
    const delta = buildSummaryDelta(summaryNums, prevNums);

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
      summaryDelta: delta,
      series: [
        {
          id: 'purchases-compare',
          label: `Compras por ${bucketLabel(grain)} (actual vs comparación)`,
          chart: 'line',
          points: mergeBucketPoints(byBucket, prevBuckets),
        },
      ],
      columns: [
        { key: 'metric', label: 'Métrica' },
        { key: 'current', label: 'Actual', align: 'right' },
        { key: 'previous', label: 'Comparación', align: 'right' },
        { key: 'deltaPct', label: 'Δ %', align: 'right' },
      ],
      rows: Object.keys(summaryNums).map((key) => {
        const d = delta[key];
        return {
          metric: key,
          current: d.current,
          previous: d.previous,
          deltaPct: d.deltaPct,
        };
      }),
      footnotes: [
        `Período actual: ${params.dateFrom} → ${params.dateTo}. Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`,
      ],
    };
  }
}
