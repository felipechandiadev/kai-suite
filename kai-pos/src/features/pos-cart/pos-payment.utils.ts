export function makePaymentLineId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `pay_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
