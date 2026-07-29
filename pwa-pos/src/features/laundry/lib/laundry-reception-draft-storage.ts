/**
 * Borrador de “Nueva guía de lavandería” en localStorage.
 * Sobrevive a reload de la página hasta guardar con éxito o limpiar.
 */

import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { LaundryPaymentMode } from "@/features/laundry/types/laundry.types";

export const LAUNDRY_RECEPTION_DRAFT_KEY = "kai.pos.laundryReceptionDraft.v1";

export type LaundryDraftServiceLine = {
  key: string;
  productVariantId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export type LaundryDraftGarment = {
  key: string;
  garmentTypeId: string;
  quantity: number;
  attributeValues: Record<string, string>;
  selectedCareTemplateIds: string[];
  careInstructions: string;
  customerNotes: string;
  serviceLines: LaundryDraftServiceLine[];
};

export type LaundryReceptionDraftV1 = {
  v: 1;
  garments: LaundryDraftGarment[];
  selectedGarmentKey: string | null;
  selectedCustomer: PosSaleCustomer | null;
  paymentMode: LaundryPaymentMode;
  depositAmount: number;
  promisedAtLocal: string;
  notes: string;
  priceListId?: string;
  updatedAt: string;
};

function isDraftGarment(value: unknown): value is LaundryDraftGarment {
  if (!value || typeof value !== "object") return false;
  const g = value as LaundryDraftGarment;
  return (
    typeof g.key === "string" &&
    typeof g.garmentTypeId === "string" &&
    typeof g.quantity === "number" &&
    Array.isArray(g.serviceLines)
  );
}

export function readLaundryReceptionDraft(): LaundryReceptionDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAUNDRY_RECEPTION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LaundryReceptionDraftV1;
    if (parsed?.v !== 1 || !Array.isArray(parsed.garments)) return null;
    if (!parsed.garments.every(isDraftGarment)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLaundryReceptionDraft(
  draft: Omit<LaundryReceptionDraftV1, "v" | "updatedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: LaundryReceptionDraftV1 = {
      ...draft,
      v: 1,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LAUNDRY_RECEPTION_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearLaundryReceptionDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAUNDRY_RECEPTION_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
