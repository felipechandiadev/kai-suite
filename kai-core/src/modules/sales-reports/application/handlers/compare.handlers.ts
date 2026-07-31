import { BadRequestException, Injectable } from '@nestjs/common';
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

@Injectable()
export class SalesPeriodCompareHandler implements SalesReportHandler {
  readonly id = 'sales-period-compare';
  readonly title = 'Comparativo de período';
  readonly description =
    'Ventas del período vs período anterior o mismo lapso del año pasado.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    let compareWith = parseCompareWith(params.compareWith);
    if (compareWith === 'none') compareWith = 'previousPeriod';
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: this.q.optionalUuid(params, 'branchId'),
      pointOfSaleIds: this.q.optionalUuidList(params, 'pointOfSaleIds'),
      granularity: resolveGranularity(params.granularity, range.dateFrom, range.dateTo),
      compareWith,
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
    const cmp = compareDateRange(params.dateFrom, params.dateTo, params.compareWith);
    if (!cmp) {
      throw new BadRequestException('compareWith es requerido');
    }
    const prevRange = this.q.parseDateRange(cmp);

    const [summary, byBucket, margin, prevSummary, prevBuckets, prevMargin] =
      await Promise.all([
        this.q.salesSummary(ctx.companyId, range, filter),
        this.q.salesByBucket(ctx.companyId, range, filter, grain),
        this.q.marginForLines(ctx.companyId, range, {
          branchId: params.branchId,
          pointOfSaleIds: params.pointOfSaleIds,
        }),
        this.q.salesSummary(ctx.companyId, prevRange, filter),
        this.q.salesByBucket(ctx.companyId, prevRange, filter, grain),
        this.q.marginForLines(ctx.companyId, prevRange, {
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
    const prevNums = {
      totalSales: money(prevSummary.total),
      ticketCount: prevSummary.count,
      avgTicket: money(prevSummary.avgTicket),
      grossMargin: money(prevMargin.margin),
      marginCoveragePct: prevMargin.quality.coveragePct,
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
      params: {
        ...params,
        compareFrom: cmp.dateFrom,
        compareTo: cmp.dateTo,
      },
      summary: summaryNums,
      summaryDelta: buildSummaryDelta(summaryNums, prevNums),
      series: [
        {
          id: 'sales-compare',
          label: 'Ventas actual vs comparación',
          chart: 'line',
          points: dualPoints,
        },
      ],
      columns: [
        { key: 'metric', label: 'Métrica' },
        { key: 'current', label: 'Actual', align: 'right' },
        { key: 'previous', label: 'Comparación', align: 'right' },
        { key: 'deltaPct', label: 'Δ %', align: 'right' },
      ],
      rows: Object.keys(summaryNums).map((key) => {
        const d = buildSummaryDelta(summaryNums, prevNums)[key];
        return {
          metric: key,
          current: d.current,
          previous: d.previous,
          deltaPct: d.deltaPct,
        };
      }),
      footnotes: [
        `Período actual: ${params.dateFrom} → ${params.dateTo}. Comparación: ${cmp.dateFrom} → ${cmp.dateTo}.`,
        this.q.marginFootnote(margin.quality),
      ],
      marginQuality: margin.quality,
    };
  }
}

@Injectable()
export class PosCompareHandler implements SalesReportHandler {
  readonly id = 'pos-compare';
  readonly title = 'Comparativo entre POS';
  readonly description = 'Compara dos puntos de venta lado a lado en el mismo período.';
  readonly wave = 'p1' as const;

  constructor(private readonly q: SalesReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    const posAId = this.q.requireUuid(params, 'posAId');
    const posBId = this.q.requireUuid(params, 'posBId');
    if (posAId === posBId) {
      throw new BadRequestException('Los dos puntos de venta deben ser distintos');
    }
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: this.q.optionalUuid(params, 'branchId'),
      posAId,
      posBId,
    };
  }

  async run(ctx: SalesReportHandlerContext): Promise<SalesReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filterA = {
      branchId: params.branchId,
      pointOfSaleIds: [params.posAId],
    };
    const filterB = {
      branchId: params.branchId,
      pointOfSaleIds: [params.posBId],
    };

    const [sumA, sumB, byDayA, byDayB] = await Promise.all([
      this.q.salesSummary(ctx.companyId, range, filterA),
      this.q.salesSummary(ctx.companyId, range, filterB),
      this.q.salesByDay(ctx.companyId, range, filterA),
      this.q.salesByDay(ctx.companyId, range, filterB),
    ]);

    const mapB = new Map(byDayB.map((d) => [d.day, d.total]));
    const allDays = Array.from(
      new Set([...byDayA.map((d) => d.day), ...byDayB.map((d) => d.day)]),
    ).sort();

    const summaryNums = {
      totalSales: money(sumA.total),
      ticketCount: sumA.count,
      avgTicket: money(sumA.avgTicket),
    };
    const summaryB = {
      totalSales: money(sumB.total),
      ticketCount: sumB.count,
      avgTicket: money(sumB.avgTicket),
    };

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        ...summaryNums,
        // second POS metrics as labeled extras
        totalSalesB: summaryB.totalSales,
        ticketCountB: summaryB.ticketCount,
        avgTicketB: summaryB.avgTicket,
      },
      summaryDelta: buildSummaryDelta(summaryNums, summaryB),
      series: [
        {
          id: 'pos-a-vs-b',
          label: 'Ventas diarias POS A (y) vs POS B (y2)',
          chart: 'line',
          points: allDays.map((day) => ({
            x: day,
            y: money(byDayA.find((d) => d.day === day)?.total ?? 0),
            y2: money(mapB.get(day) ?? 0),
          })),
        },
      ],
      columns: [
        { key: 'pos', label: 'POS' },
        { key: 'ticketCount', label: 'Tickets', align: 'right' },
        { key: 'totalSales', label: 'Ventas', align: 'right' },
        { key: 'avgTicket', label: 'Ticket prom.', align: 'right' },
      ],
      rows: [
        {
          pos: 'POS A',
          ticketCount: sumA.count,
          totalSales: money(sumA.total),
          avgTicket: money(sumA.avgTicket),
        },
        {
          pos: 'POS B',
          ticketCount: sumB.count,
          totalSales: money(sumB.total),
          avgTicket: money(sumB.avgTicket),
        },
      ],
      footnotes: [
        'Los deltas de las KPI comparan POS A (actual) vs POS B (comparación).',
      ],
    };
  }
}
