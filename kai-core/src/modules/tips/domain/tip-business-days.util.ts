/** Suma días hábiles (lun–vie) en calendario UTC. */
export function addBusinessDaysUtc(from: Date, businessDays: number): Date {
  const days = Math.max(0, Math.floor(businessDays));
  const d = new Date(from.getTime());
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) left -= 1;
  }
  return d;
}

export function isCardTipPaymentMethod(method: string | null | undefined): boolean {
  const m = String(method ?? '')
    .trim()
    .toUpperCase();
  return (
    m === 'DEBIT_CARD' ||
    m === 'CREDIT_CARD' ||
    m === 'CARD' ||
    m.includes('DEBIT') ||
    m.includes('CREDIT') ||
    m.includes('MERCADO') ||
    m.includes('POINT')
  );
}

/** Chile Art. 64: máx. 7 días hábiles desde recepción del tip tarjeta. */
export const TIP_CARD_DUE_BUSINESS_DAYS = 7;
