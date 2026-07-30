/** Anticipo en CLP a partir del total y un % (redondeo entero, sin decimales). */
export function depositAmountFromPercent(total: number, percent: number): number {
  const t = Math.max(0, Math.round(total));
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  if (t <= 0 || p <= 0) return 0;
  return Math.round((t * p) / 100);
}

export function clampDepositPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

export function clampDepositAmount(amount: number, maxTotal: number): number {
  if (!Number.isFinite(amount)) return 0;
  const max = Math.max(0, Math.round(maxTotal));
  return Math.min(max, Math.max(0, Math.round(amount)));
}
