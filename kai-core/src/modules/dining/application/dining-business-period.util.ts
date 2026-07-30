import * as moment from 'moment-timezone';

export const DEFAULT_DINING_TIMEZONE = 'America/Santiago';
export const DEFAULT_DINING_RESET_TIME = '00:00:01';

const RESET_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

export function normalizeDiningResetTime(raw: string | null | undefined): string {
  const value = (raw ?? '').trim() || DEFAULT_DINING_RESET_TIME;
  if (!RESET_TIME_RE.test(value)) {
    throw new Error(`Hora de reset inválida: ${value}. Use HH:mm:ss.`);
  }
  return value;
}

export function normalizeDiningTimezone(raw: string | null | undefined): string {
  const value = (raw ?? '').trim() || DEFAULT_DINING_TIMEZONE;
  if (!moment.tz.zone(value)) {
    throw new Error(`Timezone inválida: ${value}`);
  }
  return value;
}

/**
 * Día operativo YYYY-MM-DD.
 * Antes de resetTimeLocal en el día calendario local → periodo del día anterior.
 */
export function diningBusinessPeriodKey(
  now: Date,
  timeZone: string,
  resetTimeLocal: string,
): string {
  const tz = normalizeDiningTimezone(timeZone);
  const reset = normalizeDiningResetTime(resetTimeLocal);
  const [hh, mm, ss] = reset.split(':').map((p) => Number(p));
  const local = moment.tz(now, tz);
  const resetAt = local.clone().startOf('day').hour(hh).minute(mm).second(ss).millisecond(0);
  if (local.isBefore(resetAt)) {
    return local.clone().subtract(1, 'day').format('YYYY-MM-DD');
  }
  return local.format('YYYY-MM-DD');
}

export function formatDiningSequenceLabel(
  kind: 'COUNTER' | 'TAKEAWAY',
  sequenceNumber: number,
): string {
  const n = Math.max(1, Math.floor(sequenceNumber));
  return kind === 'COUNTER' ? `Cuenta barra #${n}` : `Para llevar #${n}`;
}

export function formatKitchenFireLabel(sequenceNumber: number): string {
  const n = Math.max(1, Math.floor(sequenceNumber));
  return `Pedido #${n}`;
}
