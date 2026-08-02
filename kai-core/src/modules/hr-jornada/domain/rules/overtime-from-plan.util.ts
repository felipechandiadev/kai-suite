/**
 * Helpers de HE planificada: exceso vs banda / horario fijo y cupo diario.
 */

export function parseHmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function durationMinutes(startTime: string, endTime: string): number {
  const s = parseHmToMinutes(startTime);
  let e = parseHmToMinutes(endTime);
  if (e <= s) e += 24 * 60;
  return e - s;
}

/** Exceso de la jornada de la persona respecto a una banda/horario de referencia. */
export function excessOverBandMinutes(
  personStart: string,
  personEnd: string,
  bandStart: string,
  bandEnd: string,
): number {
  const person = durationMinutes(personStart, personEnd);
  const band = durationMinutes(bandStart, bandEnd);
  return Math.max(0, person - band);
}

export function clampDailyOvertime(
  minutes: number,
  maxDailyOvertimeMinutes: number,
): number {
  if (minutes <= 0) return 0;
  return Math.min(minutes, Math.max(0, maxDailyOvertimeMinutes));
}

export function shouldMaterializePaidOvertime(
  extraHoursMode?: string | null,
  overtimeEnabled = true,
): boolean {
  if (!overtimeEnabled) return false;
  if (!extraHoursMode || extraHoursMode === 'NONE') return false;
  if (extraHoursMode === 'COMPENSATORY_REST') return false;
  return (
    extraHoursMode === 'PAID_OVERTIME' ||
    extraHoursMode === 'BOTH'
  );
}

/** Primer y último día del mes calendario de una fecha ISO. */
export function calendarMonthBounds(isoDate: string): {
  periodStart: string;
  periodEnd: string;
} {
  const [y, m] = isoDate.slice(0, 10).split('-').map(Number);
  const periodStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const periodEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { periodStart, periodEnd };
}

/** Semanas del mes (días/7), mínimo 1. */
export function weeksInMonth(periodStart: string, periodEnd: string): number {
  const a = new Date(`${periodStart}T12:00:00Z`);
  const b = new Date(`${periodEnd}T12:00:00Z`);
  const days =
    Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, days / 7);
}
