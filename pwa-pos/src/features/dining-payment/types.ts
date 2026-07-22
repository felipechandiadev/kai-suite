import type { DiningOrderKind } from "@/features/dining/types/dining-pos.types";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";

export type DiningPaymentOrderMeta = {
  id: string;
  displayLabel: string;
  kind: DiningOrderKind;
};

export type DiningPaymentDraft = {
  order: DiningPaymentOrderMeta;
  lines: PosCartLine[];
  payments: PosPaymentLine[];
  orderDiscount: number;
};

export type DiningTab = "mesas" | "barra" | "takeaway";

export function diningKindToTab(kind: DiningOrderKind): DiningTab {
  if (kind === "COUNTER") return "barra";
  if (kind === "TAKEAWAY") return "takeaway";
  return "mesas";
}

/** Volver a cuentas manteniendo la cuenta seleccionada (p. ej. cancelar cobro). */
export function diningPaymentExitHref(order: DiningPaymentOrderMeta): string {
  const params = new URLSearchParams({
    diningOrderId: order.id,
    diningTab: diningKindToTab(order.kind),
  });
  return `/accounts?${params.toString()}`;
}

/** Lista de cuentas sin selección (p. ej. tras cobro exitoso). */
export function diningAccountsListHref(tab: DiningTab = "mesas"): string {
  const params = new URLSearchParams({ diningTab: tab });
  return `/accounts?${params.toString()}`;
}
