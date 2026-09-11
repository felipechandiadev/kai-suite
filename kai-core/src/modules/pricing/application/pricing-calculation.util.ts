import type { PricingAlertLevel } from '../domain/pricing.types';

function money(n: number): number {
  return Number(Number(n).toFixed(2));
}

export function resolvePricingAlert(
  floorNet: number,
  listNet: number,
  peNet: number,
): PricingAlertLevel {
  if (floorNet <= 0) {
    return 'INSUFFICIENT_DATA';
  }
  if (listNet < floorNet) {
    return 'BELOW_FLOOR';
  }
  if (listNet < peNet) {
    return 'BELOW_PE';
  }
  return 'OK';
}

export function computeTargetNet(floorNet: number, targetMarginPercent: number): number {
  const margin = Number(targetMarginPercent) / 100;
  if (floorNet <= 0 || margin >= 1) {
    return 0;
  }
  return money(floorNet / (1 - margin));
}

export function computePeNet(floorNet: number, unitQuota: number): number {
  if (floorNet <= 0) {
    return 0;
  }
  return money(floorNet + Math.max(0, unitQuota));
}

export function computeSuggestedNet(targetNet: number, peNet: number): number {
  return money(Math.max(targetNet, peNet));
}

export function grossFromNet(net: number, listNet: number, listGross: number): number {
  if (net <= 0) {
    return 0;
  }
  if (listNet > 0 && listGross > 0) {
    return money(net * (listGross / listNet));
  }
  return money(net);
}

export function isoWeekRange(weekIso: string): { dateFrom: string; dateTo: string; from: Date; to: Date } {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekIso.trim());
  if (!match) {
    throw new Error('weekIso inválido (use YYYY-Www)');
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateFrom = `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
  const dateTo = `${sunday.getUTCFullYear()}-${pad(sunday.getUTCMonth() + 1)}-${pad(sunday.getUTCDate())}`;
  return {
    dateFrom,
    dateTo,
    from: new Date(`${dateFrom}T00:00:00.000Z`),
    to: new Date(`${dateTo}T23:59:59.999Z`),
  };
}

/** Ventana ex ante: semana ISO anterior a la de análisis. */
export function previousIsoWeek(weekIso: string): string {
  const { from } = isoWeekRange(weekIso);
  const prev = new Date(from);
  prev.setUTCDate(prev.getUTCDate() - 7);
  const tmp = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${tmp.getUTCFullYear()}-W${pad(weekNo)}`;
}
