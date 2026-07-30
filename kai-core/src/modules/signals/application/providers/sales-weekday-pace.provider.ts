import { Injectable } from '@nestjs/common';
import { SalesReportsQueryService } from '@modules/sales-reports/application/sales-reports-query.service';
import { SIGNAL_THRESHOLDS } from '../../domain/signal.thresholds';
import type { SignalEvidenceDto } from '../../domain/signal-evidence.types';
import type { SignalCardDto, SignalEvalContext } from '../../domain/signal.types';
import type { SignalProvider } from './signal-provider';

const CTA = {
  label: 'Ver reportes de venta',
  href: '/sales/reports',
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

type PaceComputed = {
  card: SignalCardDto;
  byDay: Array<{ day: string; total: number }>;
  todayKey: string;
  weekday: number;
  baselineAvg: number;
  baselineWeeks: number;
  watchDropPct: number;
  criticalDropPct: number;
  weekdayLabel: string;
};

@Injectable()
export class SalesWeekdayPaceProvider implements SignalProvider {
  readonly id = 'sales-weekday-pace';

  constructor(private readonly salesReports: SalesReportsQueryService) {}

  private async compute(ctx: SignalEvalContext): Promise<PaceComputed> {
    const { baselineWeeks, watchDropPct, criticalDropPct } =
      SIGNAL_THRESHOLDS.salesWeekdayPace;
    const todayStart = startOfDay(ctx.now);
    const todayEnd = endOfDay(ctx.now);
    const weekday = todayStart.getDay();

    const windowFrom = new Date(todayStart);
    windowFrom.setDate(windowFrom.getDate() - baselineWeeks * 7);

    const byDay = await this.salesReports.salesByDay(
      ctx.companyId,
      {
        from: windowFrom,
        to: todayEnd,
        dateFrom: ymd(windowFrom),
        dateTo: ymd(todayEnd),
      },
      { branchId: ctx.branchId },
    );

    const todayKey = ymd(todayStart);
    const todayTotal = byDay.find((d) => d.day === todayKey)?.total ?? 0;

    const baselineDays = byDay.filter((d) => {
      if (d.day === todayKey) return false;
      const dt = new Date(`${d.day}T12:00:00`);
      return dt.getDay() === weekday;
    });

    const baselineAvg =
      baselineDays.length > 0
        ? baselineDays.reduce((s, d) => s + d.total, 0) / baselineDays.length
        : 0;

    let severity: SignalCardDto['severity'] = 'OK';
    let dropPct = 0;
    if (baselineAvg > 0) {
      dropPct = ((todayTotal - baselineAvg) / baselineAvg) * 100;
      if (dropPct <= criticalDropPct) severity = 'CRITICAL';
      else if (dropPct <= watchDropPct) severity = 'WATCH';
    } else if (todayTotal === 0) {
      severity = 'INFO';
    }

    const weekdayLabel = new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
    }).format(todayStart);

    const headline =
      baselineAvg <= 0
        ? todayTotal > 0
          ? `${fmtMoney(todayTotal)} hoy`
          : 'Sin referencia histórica'
        : `${dropPct >= 0 ? '+' : ''}${dropPct.toFixed(0)}% vs ${weekdayLabel}`;

    const context =
      baselineAvg <= 0
        ? `Hoy ${fmtMoney(todayTotal)} · sin promedio de ${baselineWeeks} semanas`
        : `Hoy ${fmtMoney(todayTotal)} · promedio ${weekdayLabel} ${fmtMoney(baselineAvg)} (${baselineDays.length} días)`;

    const insight =
      severity === 'CRITICAL'
        ? 'Ritmo de venta muy bajo para este día de la semana: revisa demanda y operación.'
        : severity === 'WATCH'
          ? 'Vas debajo del ritmo habitual de este día de la semana; vigila el cierre del día.'
          : severity === 'INFO'
            ? 'Aún no hay histórico comparable para este día de la semana.'
            : 'Ritmo de venta alineado (o sobre) el promedio de este día de la semana.';

    return {
      card: {
        id: this.id,
        title: 'Ritmo de venta del día',
        severity,
        headline,
        context,
        insight,
        cta: CTA,
        computedAt: ctx.now.toISOString(),
        meta: {
          todayTotal,
          baselineAvg,
          dropPct,
          baselineDays: baselineDays.length,
        },
      },
      byDay,
      todayKey,
      weekday,
      baselineAvg,
      baselineWeeks,
      watchDropPct,
      criticalDropPct,
      weekdayLabel,
    };
  }

  async evaluate(ctx: SignalEvalContext): Promise<SignalCardDto> {
    return (await this.compute(ctx)).card;
  }

  async evidence(ctx: SignalEvalContext): Promise<SignalEvidenceDto> {
    const c = await this.compute(ctx);
    const points = c.byDay.map((d) => {
      const dt = new Date(`${d.day}T12:00:00`);
      return {
        x: d.day,
        y: Math.round(d.total),
        highlight: dt.getDay() === c.weekday,
      };
    });

    const thresholdLines =
      c.baselineAvg > 0
        ? [
            {
              label: `Promedio ${c.weekdayLabel}`,
              y: Math.round(c.baselineAvg),
            },
            {
              label: `Vigilar (${c.watchDropPct}%)`,
              y: Math.round(c.baselineAvg * (1 + c.watchDropPct / 100)),
            },
            {
              label: `Crítico (${c.criticalDropPct}%)`,
              y: Math.round(c.baselineAvg * (1 + c.criticalDropPct / 100)),
            },
          ]
        : undefined;

    return {
      signalId: this.id,
      title: c.card.title,
      severity: c.card.severity,
      headline: c.card.headline,
      methodology: `Compara la venta de hoy con el promedio de los mismos ${c.weekdayLabel}s en las últimas ${c.baselineWeeks} semanas. Vigilar si cae ≤ ${c.watchDropPct}% y crítico si ≤ ${c.criticalDropPct}% respecto a ese promedio. Los puntos destacados son el mismo día de la semana.`,
      kind: 'timeseries',
      series: {
        label: 'Venta diaria (CLP)',
        points,
        thresholdLines,
      },
      thresholds: {
        watch: c.watchDropPct,
        critical: c.criticalDropPct,
        unit: '% vs promedio del día',
      },
      cta: CTA,
      computedAt: c.card.computedAt,
    };
  }
}
