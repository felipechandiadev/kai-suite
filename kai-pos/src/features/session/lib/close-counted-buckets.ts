import type { PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";

/** Payload alineado con `CloseCashSessionCountedDto` del backend. */
export type CloseSessionCountedPayload = {
  cash: number;
  debitCard: number;
  creditCard: number;
  transfer: number;
  check: number;
  other: number;
};

export function emptyCloseCounted(): CloseSessionCountedPayload {
  return { cash: 0, debitCard: 0, creditCard: 0, transfer: 0, check: 0, other: 0 };
}

/**
 * Acumula montos declarados por tipo semántico (enum empresa/POS).
 * Créditos y métodos desconocidos van a `other`.
 */
export function addAmountToCloseCounted(
  acc: CloseSessionCountedPayload,
  method: string,
  amount: number,
): void {
  const a = Math.max(0, Math.round(Number(amount) || 0));
  if (a <= 0) return;
  const m = String(method || "").trim().toUpperCase();
  switch (m as PosPaymentMethodId | "CREDIT" | "INTERNAL_CREDIT") {
    case "CASH":
      acc.cash += a;
      break;
    case "DEBIT_CARD":
      acc.debitCard += a;
      break;
    case "CREDIT_CARD":
      acc.creditCard += a;
      break;
    case "TRANSFER":
      acc.transfer += a;
      break;
    case "CHECK":
      acc.check += a;
      break;
    default:
      acc.other += a;
      break;
  }
}

export function grandCloseCounted(c: CloseSessionCountedPayload): number {
  return Math.round(c.cash + c.debitCard + c.creditCard + c.transfer + c.check + c.other);
}
