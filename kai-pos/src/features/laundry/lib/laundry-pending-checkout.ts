/**
 * Checkout pendiente: guía aún no creada → `/pos/payment`.
 * Charge: full | deposit | none (pagar al retirar).
 */

import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { applyUnitGrossPriceToCartLine } from "@/features/pos-cart/lib/apply-cart-line-unit-gross-price";
import type {
  CreateLaundryReceptionInput,
  LaundryGarmentAttributeValueSnapshot,
  LaundryPaymentMode,
} from "@/features/laundry/types/laundry.types";

export type LaundryPendingCharge = "full" | "deposit" | "none";

const PENDING_KEY = "kai.pos.laundryPendingCheckout.v1";

export type LaundryPendingServiceLine = {
  productVariantId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export type LaundryPendingGarment = {
  key: string;
  garmentTypeId: string;
  garmentTypeName: string;
  quantity: number;
  attributeValues: LaundryGarmentAttributeValueSnapshot[];
  careInstructions?: string;
  customerNotes?: string;
  serviceLines: LaundryPendingServiceLine[];
  subtotal: number;
};

export type LaundryPendingCheckout = {
  paymentMode: LaundryPaymentMode;
  depositAmount: number;
  servicesTotal: number;
  charge: LaundryPendingCharge;
  expectedPaidTotal: number;
  promisedAtLocal?: string;
  notes?: string;
  branchId: string;
  pointOfSaleId?: string;
  garments: LaundryPendingGarment[];
};

export function paymentModeToPendingCharge(
  mode: LaundryPaymentMode,
): LaundryPendingCharge {
  if (mode === "FULL_ON_RECEIVE") return "full";
  if (mode === "DEPOSIT_THEN_BALANCE") return "deposit";
  return "none";
}

export function resolvePendingExpectedPaidTotal(
  charge: LaundryPendingCharge,
  servicesTotal: number,
  depositAmount: number,
): number {
  const total = Math.max(0, Math.round(servicesTotal));
  if (charge === "none") return 0;
  if (charge === "deposit") {
    return Math.min(Math.max(0, Math.round(depositAmount)), total);
  }
  return total;
}

export function writeLaundryPendingCheckout(draft: LaundryPendingCheckout): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function readLaundryPendingCheckout(): LaundryPendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LaundryPendingCheckout;
    if (!parsed?.branchId || !Array.isArray(parsed.garments) || parsed.garments.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLaundryPendingCheckout(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Nombres de servicio por variantId (para imprimir guía sin catálogo). */
export function laundryServiceNamesFromPending(
  pending: LaundryPendingCheckout,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of pending.garments) {
    for (const s of g.serviceLines) {
      const id = s.productVariantId?.trim();
      const name = s.productName?.trim();
      if (id && name) out[id] = name;
    }
  }
  return out;
}

/** Nombres de tipo de prenda por id (para imprimir guía sin catálogo). */
export function laundryGarmentTypeNamesFromPending(
  pending: LaundryPendingCheckout,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of pending.garments) {
    const id = g.garmentTypeId?.trim();
    const name = g.garmentTypeName?.trim();
    if (id && name) out[id] = name;
  }
  return out;
}

/** Líneas de carrito POS para cobrar full/deposit desde el pending (sin receptionId). */
export function laundryPendingToCartLines(
  pending: LaundryPendingCheckout,
  catalogItems: PosProductSearchItem[],
): PosCartLine[] {
  const charge = pending.charge;
  if (charge === "none") return [];

  const amount = resolvePendingExpectedPaidTotal(
    charge,
    pending.servicesTotal,
    pending.depositAmount,
  );
  if (amount <= 0) return [];

  const byVariant = new Map(catalogItems.map((item) => [item.variantId, item]));
  const serviceLines = pending.garments.flatMap((g) => g.serviceLines);

  if (charge === "full" && serviceLines.length > 0) {
    const qtyByVariant = new Map<string, number>();
    for (const garment of pending.garments) {
      const garmentQty = Number(garment.quantity) || 0;
      if (garmentQty <= 0) continue;
      for (const line of garment.serviceLines) {
        const qty = (Number(line.quantity) || 0) * garmentQty;
        if (qty <= 0 || !line.productVariantId) continue;
        qtyByVariant.set(
          line.productVariantId,
          (qtyByVariant.get(line.productVariantId) ?? 0) + qty,
        );
      }
    }

    const cartLines: PosCartLine[] = [];
    for (const [variantId, qty] of qtyByVariant) {
      const item = byVariant.get(variantId);
      if (!item) continue;
      cartLines.push({
        ...item,
        quantity: qty,
        metadata: {
          ...(item.metadata ?? {}),
          sourceLaundryReception: true,
          laundryPending: true,
          laundryCharge: charge,
        },
      });
    }
    if (cartLines.length > 0) return cartLines;
  }

  const firstVariantId =
    serviceLines.find((l) => l.productVariantId)?.productVariantId ??
    catalogItems[0]?.variantId;
  if (!firstVariantId) return [];
  const item = byVariant.get(firstVariantId) ?? catalogItems[0];
  if (!item) return [];

  const label =
    charge === "deposit" ? "Abono recepción lavandería" : "Recepción lavandería";

  const base: PosCartLine = {
    ...item,
    productName: label,
    quantity: 1,
    unitTaxRate: 0,
    metadata: {
      ...(item.metadata ?? {}),
      sourceLaundryReception: true,
      laundryPending: true,
      laundryCharge: charge,
    },
  };
  return [applyUnitGrossPriceToCartLine(base, amount)];
}

export function pendingCheckoutToCreateInput(
  pending: LaundryPendingCheckout,
  customerId: string,
): CreateLaundryReceptionInput {
  return {
    branchId: pending.branchId.trim(),
    pointOfSaleId: pending.pointOfSaleId?.trim() || undefined,
    customerId: customerId.trim(),
    paymentMode: pending.paymentMode,
    depositAmount:
      pending.paymentMode === "DEPOSIT_THEN_BALANCE"
        ? pending.depositAmount
        : undefined,
    promisedAt: pending.promisedAtLocal?.trim()
      ? new Date(pending.promisedAtLocal).toISOString()
      : undefined,
    notes: pending.notes?.trim() || undefined,
    garments: pending.garments.map((g) => ({
      garmentTypeId: g.garmentTypeId,
      quantity: g.quantity,
      attributeValues: g.attributeValues.length > 0 ? g.attributeValues : undefined,
      careInstructions: g.careInstructions?.trim() || undefined,
      customerNotes: g.customerNotes?.trim() || undefined,
      serviceLines: g.serviceLines.map((line) => ({
        productVariantId: line.productVariantId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        notes: line.notes?.trim() || undefined,
      })),
    })),
  };
}
