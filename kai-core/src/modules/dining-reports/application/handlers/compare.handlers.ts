import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DiningReportHandler,
  DiningReportHandlerContext,
  DiningReportRunResult,
  buildSummaryDelta,
  compareDateRange,
  parseCompareWith,
  resolveGranularity,
} from '../../domain/dining-report.types';
import {
  DiningFilter,
  DiningReportsQueryService,
} from '../dining-reports-query.service';

function nowIso() {
  return new Date().toISOString();
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

@Injectable()
export class DiningPeriodCompareHandler implements DiningReportHandler {
  readonly id = 'dining-period-compare';
  readonly title = 'Comparativo de período';
  readonly description =
    'Salón del período vs período anterior o mismo lapso del año pasado.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: DiningReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    let compareWith = parseCompareWith(params.compareWith);
    if (compareWith === 'none') compareWith = 'previousPeriod';
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: this.q.optionalUuid(params, 'branchId'),
      diningRoomId: this.q.optionalUuid(params, 'diningRoomId'),
      orderKind: this.q.optionalOrderKind(params),
      granularity: resolveGranularity(
        params.granularity,
        range.dateFrom,
        range.dateTo,
      ),
      compareWith,
    };
  }

  async run(ctx: DiningReportHandlerContext): Promise<DiningReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter: DiningFilter = {
      branchId: params.branchId,
      diningRoomId: params.diningRoomId,
      orderKind: params.orderKind,
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

    const [summary, byBucket, prevSummary, prevBuckets] = await Promise.all([
      this.q.salonSummary(ctx.companyId, range, filter),
      this.q.salonByBucket(ctx.companyId, range, filter, grain),
      this.q.salonSummary(ctx.companyId, prevRange, filter),
      this.q.salonByBucket(ctx.companyId, prevRange, filter, grain),
    ]);

    const summaryNums = {
      accountCount: summary.accountCount,
      totalSales: money(summary.totalSales),
      avgTicket: money(summary.avgTicket),
      avgDwellMinutes: round1(summary.avgDwellMinutes),
      tipTotal: money(summary.tipTotal),
      tipPct: round1(summary.tipPct),
    };
    const prevNums = {
      accountCount: prevSummary.accountCount,
      totalSales: money(prevSummary.totalSales),
      avgTicket: money(prevSummary.avgTicket),
      avgDwellMinutes: round1(prevSummary.avgDwellMinutes),
      tipTotal: money(prevSummary.tipTotal),
      tipPct: round1(prevSummary.tipPct),
    };

    const len = Math.max(byBucket.length, prevBuckets.length);
    const dualPoints: Array<{ x: string; y: number; y2?: number }> = [];
    for (let i = 0; i < len; i++) {
      const cur = byBucket[i];
      const prev = prevBuckets[i];
      dualPoints.push({
        x: cur?.day ?? prev?.day ?? String(i + 1),
        y: money(cur?.total ?? 0),
        y2: money(prev?.total ?? 0),
      });
    }

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: summaryNums,
      summaryDelta: buildSummaryDelta(summaryNums, prevNums),
      series: [
        {
          id: 'sales-compare',
          label: 'Ventas (actual vs comparación)',
          chart: 'area',
          points: dualPoints,
        },
      ],
      columns: [
        { key: 'metric', label: 'Indicador' },
        { key: 'current', label: 'Actual', align: 'right' },
        { key: 'previous', label: 'Comparación', align: 'right' },
        { key: 'deltaPct', label: 'Δ %', align: 'right' },
      ],
      rows: Object.keys(summaryNums).map((key) => {
        const delta = buildSummaryDelta(summaryNums, prevNums)[key];
        return {
          metric: key,
          current: delta.current,
          previous: delta.previous,
          deltaPct: delta.deltaPct,
        };
      }),
      footnotes: [
        `Comparación: ${params.compareWith === 'samePeriodLastYear' ? 'mismo lapso año pasado' : 'período anterior'} (${cmp.dateFrom} → ${cmp.dateTo}).`,
      ],
    };
  }
}
