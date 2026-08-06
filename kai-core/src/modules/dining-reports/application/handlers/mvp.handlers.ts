import { Injectable } from '@nestjs/common';
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

function filterFrom(params: {
  branchId?: string;
  diningRoomId?: string;
  orderKind?: DiningFilter['orderKind'];
}): DiningFilter {
  return {
    branchId: params.branchId,
    diningRoomId: params.diningRoomId,
    orderKind: params.orderKind,
  };
}

@Injectable()
export class DiningSalonSummaryHandler implements DiningReportHandler {
  readonly id = 'dining-salon-summary';
  readonly title = 'Resumen del salón';
  readonly description =
    'Cuentas cerradas, ventas, ticket medio, permanencia y propina del período.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: DiningReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
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
      compareWith: parseCompareWith(params.compareWith),
    };
  }

  async run(ctx: DiningReportHandlerContext): Promise<DiningReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = filterFrom(params);
    const grain = params.granularity;

    const [summary, byBucket] = await Promise.all([
      this.q.salonSummary(ctx.companyId, range, filter),
      this.q.salonByBucket(ctx.companyId, range, filter, grain),
    ]);

    const summaryNums = {
      accountCount: summary.accountCount,
      totalSales: money(summary.totalSales),
      avgTicket: money(summary.avgTicket),
      avgDwellMinutes: round1(summary.avgDwellMinutes),
      tipTotal: money(summary.tipTotal),
      tipPct: round1(summary.tipPct),
    };

    let summaryDelta: DiningReportRunResult['summaryDelta'];
    let previousBuckets: typeof byBucket = [];
    const cmp = compareDateRange(
      params.dateFrom,
      params.dateTo,
      params.compareWith,
    );
    if (cmp) {
      const prevRange = this.q.parseDateRange(cmp);
      const [prevSummary, prevBuckets] = await Promise.all([
        this.q.salonSummary(ctx.companyId, prevRange, filter),
        this.q.salonByBucket(ctx.companyId, prevRange, filter, grain),
      ]);
      previousBuckets = prevBuckets;
      summaryDelta = buildSummaryDelta(summaryNums, {
        accountCount: prevSummary.accountCount,
        totalSales: money(prevSummary.totalSales),
        avgTicket: money(prevSummary.avgTicket),
        avgDwellMinutes: round1(prevSummary.avgDwellMinutes),
        tipTotal: money(prevSummary.tipTotal),
        tipPct: round1(prevSummary.tipPct),
      });
    }

    const grainLabel =
      grain === 'month' ? 'mes' : grain === 'week' ? 'semana' : 'día';
    const salesPoints =
      previousBuckets.length > 0
        ? (() => {
            const len = Math.max(byBucket.length, previousBuckets.length);
            const points: Array<{ x: string; y: number; y2?: number }> = [];
            for (let i = 0; i < len; i++) {
              const cur = byBucket[i];
              const prev = previousBuckets[i];
              points.push({
                x: cur?.day ?? prev?.day ?? String(i + 1),
                y: money(cur?.total ?? 0),
                y2: prev != null ? money(prev.total) : undefined,
              });
            }
            return points;
          })()
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
          id: 'accounts-by-bucket',
          label: `Cuentas por ${grainLabel}`,
          chart: 'bar',
          points: byBucket.map((d) => ({ x: d.day, y: d.count })),
        },
      ],
      columns: [
        {
          key: 'day',
          label: grain === 'month' ? 'Mes' : grain === 'week' ? 'Semana' : 'Día',
        },
        { key: 'count', label: 'Cuentas', align: 'right' },
        { key: 'total', label: 'Ventas', align: 'right' },
        { key: 'avgTicket', label: 'Ticket prom.', align: 'right' },
        { key: 'avgDwellMinutes', label: 'Permanencia (min)', align: 'right' },
      ],
      rows: byBucket.map((d) => ({
        day: d.day,
        count: d.count,
        total: money(d.total),
        avgTicket: money(d.avgTicket),
        avgDwellMinutes: round1(d.avgDwellMinutes),
      })),
      totals: {
        total: money(summary.totalSales),
        count: summary.accountCount,
      },
      footnotes: [
        'Solo cuentas CLOSED con cierre en el rango. Ventas = total del documento de venta vinculado. Propina = ledger (no VOID).',
      ],
    };
  }
}

@Injectable()
export class DiningByHourHandler implements DiningReportHandler {
  readonly id = 'dining-by-hour';
  readonly title = 'Actividad por hora';
  readonly description =
    'Curva de cuentas y ventas por hora de cierre (zona America/Santiago).';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: DiningReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: this.q.optionalUuid(params, 'branchId'),
      diningRoomId: this.q.optionalUuid(params, 'diningRoomId'),
      orderKind: this.q.optionalOrderKind(params),
    };
  }

  async run(ctx: DiningReportHandlerContext): Promise<DiningReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = filterFrom(params);
    const [summary, byHour] = await Promise.all([
      this.q.salonSummary(ctx.companyId, range, filter),
      this.q.salonByHour(ctx.companyId, range, filter),
    ]);

    const peak = byHour.reduce(
      (best, h) => (h.count > best.count ? h : best),
      byHour[0] ?? { hour: 0, count: 0, total: 0 },
    );

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        accountCount: summary.accountCount,
        totalSales: money(summary.totalSales),
        peakHour: peak.hour,
        peakHourAccounts: peak.count,
      },
      series: [
        {
          id: 'accounts-by-hour',
          label: 'Cuentas por hora',
          chart: 'bar',
          points: byHour.map((h) => ({
            x: `${String(h.hour).padStart(2, '0')}:00`,
            y: h.count,
          })),
        },
        {
          id: 'sales-by-hour',
          label: 'Ventas por hora',
          chart: 'area',
          points: byHour.map((h) => ({
            x: `${String(h.hour).padStart(2, '0')}:00`,
            y: money(h.total),
          })),
        },
      ],
      columns: [
        { key: 'hour', label: 'Hora' },
        { key: 'count', label: 'Cuentas', align: 'right' },
        { key: 'total', label: 'Ventas', align: 'right' },
      ],
      rows: byHour.map((h) => ({
        hour: `${String(h.hour).padStart(2, '0')}:00`,
        count: h.count,
        total: money(h.total),
      })),
      totals: {
        count: summary.accountCount,
        total: money(summary.totalSales),
      },
      footnotes: [
        'Hora según cierre de cuenta en zona America/Santiago.',
      ],
    };
  }
}

@Injectable()
export class DiningByTableHandler implements DiningReportHandler {
  readonly id = 'dining-by-table';
  readonly title = 'Mesas y salones';
  readonly description =
    'Turnos, ticket y permanencia media por mesa / salón.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: DiningReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.parseDateRange(params);
    return {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: this.q.optionalUuid(params, 'branchId'),
      diningRoomId: this.q.optionalUuid(params, 'diningRoomId'),
      orderKind: this.q.optionalOrderKind(params),
    };
  }

  async run(ctx: DiningReportHandlerContext): Promise<DiningReportRunResult> {
    const params = this.validate(ctx.params);
    const range = this.q.parseDateRange(params);
    const filter = filterFrom(params);
    const [summary, rows] = await Promise.all([
      this.q.salonSummary(ctx.companyId, range, filter),
      this.q.salonByTable(ctx.companyId, range, filter),
    ]);

    const top = rows.slice(0, 15);

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        accountCount: summary.accountCount,
        totalSales: money(summary.totalSales),
        tableCount: rows.length,
        avgDwellMinutes: round1(summary.avgDwellMinutes),
      },
      series: [
        {
          id: 'sales-by-table',
          label: 'Ventas por mesa (top 15)',
          chart: 'bar',
          points: top.map((r) => ({
            x: r.tableLabel,
            y: money(r.total),
          })),
        },
        {
          id: 'turns-by-table',
          label: 'Turnos por mesa (top 15)',
          chart: 'bar',
          points: top.map((r) => ({
            x: r.tableLabel,
            y: r.turns,
          })),
        },
      ],
      columns: [
        { key: 'roomName', label: 'Salón' },
        { key: 'tableLabel', label: 'Mesa' },
        { key: 'turns', label: 'Turnos', align: 'right' },
        { key: 'total', label: 'Ventas', align: 'right' },
        { key: 'avgTicket', label: 'Ticket prom.', align: 'right' },
        { key: 'avgDwellMinutes', label: 'Permanencia (min)', align: 'right' },
      ],
      rows: rows.map((r) => ({
        roomName: r.roomName,
        tableLabel: r.tableLabel,
        turns: r.turns,
        total: money(r.total),
        avgTicket: money(r.avgTicket),
        avgDwellMinutes: round1(r.avgDwellMinutes),
      })),
      totals: {
        turns: summary.accountCount,
        total: money(summary.totalSales),
      },
    };
  }
}
