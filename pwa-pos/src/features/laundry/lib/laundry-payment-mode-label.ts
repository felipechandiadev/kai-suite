import type { LaundryPaymentMode } from "../types/laundry.types";

const PAYMENT_MODE_LABELS: Record<LaundryPaymentMode, string> = {
  FULL_ON_RECEIVE: "Pago total al recibir",
  FULL_ON_PICKUP: "Pago total al retirar",
  DEPOSIT_THEN_BALANCE: "Abono y saldo al retirar",
};

export function laundryPaymentModeLabel(mode: LaundryPaymentMode | string): string {
  const key = String(mode).trim().toUpperCase() as LaundryPaymentMode;
  return PAYMENT_MODE_LABELS[key] ?? String(mode);
}

export const LAUNDRY_PAYMENT_MODE_OPTIONS: Array<{
  value: LaundryPaymentMode;
  label: string;
}> = (Object.keys(PAYMENT_MODE_LABELS) as LaundryPaymentMode[]).map((value) => ({
  value,
  label: PAYMENT_MODE_LABELS[value],
}));
