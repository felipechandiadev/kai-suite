import type { AnalyticsPeriodDto } from '../domain/analytics.types';

export type ResolvedAnalyticsPeriod = {
  from: Date;
  to: Date;
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

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function parseIsoDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toPeriodDto(period: ResolvedAnalyticsPeriod): AnalyticsPeriodDto {
  return {
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  };
}

/** Resuelve el rango del reporte (por defecto: mes calendario actual hasta hoy). */
export function resolveAnalyticsPeriod(opts?: {
  from?: string;
  to?: string;
}): ResolvedAnalyticsPeriod {
  const now = new Date();
  const to = opts?.to ? endOfDay(parseIsoDate(opts.to) ?? now) : endOfDay(now);
  const from = opts?.from
    ? startOfDay(parseIsoDate(opts.from) ?? startOfMonth(to))
    : startOfMonth(to);
  if (from.getTime() > to.getTime()) {
    return { from: startOfDay(to), to };
  }
  return { from, to };
}

/** Período anterior de la misma duración (para comparación). */
export function resolvePreviousPeriod(
  period: ResolvedAnalyticsPeriod,
): ResolvedAnalyticsPeriod {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days =
    Math.floor(
      (endOfDay(period.to).getTime() - startOfDay(period.from).getTime()) / msPerDay,
    ) + 1;
  const prevTo = endOfDay(new Date(startOfDay(period.from).getTime() - msPerDay));
  const prevFrom = startOfDay(new Date(prevTo.getTime() - (days - 1) * msPerDay));
  return { from: prevFrom, to: prevTo };
}

/** Inicio del rango para series de tendencia (N meses hacia atrás desde `anchor`). */
export function resolveTrendRange(
  anchor: Date,
  months: number,
): ResolvedAnalyticsPeriod {
  const safeMonths = Math.min(24, Math.max(1, Math.floor(months) || 12));
  const to = endOfDay(anchor);
  const from = startOfDay(
    new Date(to.getFullYear(), to.getMonth() - (safeMonths - 1), 1),
  );
  return { from, to };
}

export function changePct(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
