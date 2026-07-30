const SANTIAGO_TZ = 'America/Santiago';

export function getTodayIsoSantiago(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: SANTIAGO_TZ });
}

function getNowMinutesSantiago(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SANTIAGO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function timeToMinutes(value: string): number {
  const normalized = value.slice(0, 5);
  const [h, m] = normalized.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatCutoffTime(value: string): string {
  return value.slice(0, 5);
}

/** True while orders can still be added (cut-off not yet reached for this occurrence). */
export function isOrderCutoffOpen(
  occurrenceDate: string,
  orderCutoffTime: string,
  now = new Date(),
): boolean {
  const today = getTodayIsoSantiago(now);
  if (occurrenceDate < today) return false;
  if (occurrenceDate > today) return true;
  return getNowMinutesSantiago(now) < timeToMinutes(orderCutoffTime);
}

export function orderCutoffStartBlockReason(
  occurrenceDate: string,
  orderCutoffTime: string,
  now = new Date(),
): string | null {
  if (!isOrderCutoffOpen(occurrenceDate, orderCutoffTime, now)) return null;
  const today = getTodayIsoSantiago(now);
  if (occurrenceDate > today) {
    return 'El reparto es para otra fecha; aún no puedes iniciarlo';
  }
  return `Aún no ha pasado el cierre de pedidos (${formatCutoffTime(orderCutoffTime)})`;
}
