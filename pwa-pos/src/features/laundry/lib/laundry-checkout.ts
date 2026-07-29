/**
 * Checkout lavandería → carrito POS / pago.
 * Charge kinds: full | deposit | balance.
 */

import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { applyUnitGrossPriceToCartLine } from "@/features/pos-cart/lib/apply-cart-line-unit-gross-price";
import type { LaundryReception } from "@/features/laundry/types/laundry.types";

export type LaundryCheckoutCharge = "full" | "deposit" | "balance";

const LS_KEY = "kai.pos.laundryCheckout";

export type LaundryCheckoutDraft = {
  receptionId: string;
  code: string;
  charge: LaundryCheckoutCharge;
  expectedPaidTotal: number;
};

export function writeLaundryCheckoutDraft(draft: LaundryCheckoutDraft): void {
  try {
    sessionStorage.setItem(LS_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function readLaundryCheckoutDraft(): LaundryCheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LaundryCheckoutDraft;
    if (!parsed?.receptionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLaundryCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

export function laundryReceptionCustomer(
  reception: LaundryReception,
): PosSaleCustomer {
  return {
    customerId: reception.customerId,
    name: reception.customerNameSnapshot?.trim() || "Cliente",
    document: "",
    phone: reception.customerPhoneSnapshot?.trim() || "",
    email: null,
  };
}

export function resolveLaundryChargeAmount(
  reception: LaundryReception,
  charge: LaundryCheckoutCharge,
): number {
  const total = Math.round(Number(reception.servicesTotal) || 0);
  const paid = Math.round(Number(reception.paidAmount) || 0);
  const deposit = Math.round(Number(reception.depositAmount) || 0);
  const balance = Math.max(0, total - paid);
  if (charge === "deposit") {
    const remainingDeposit = Math.max(0, deposit - paid);
    if (remainingDeposit > 0) return Math.min(remainingDeposit, balance);
    return Math.min(deposit > 0 ? deposit : Math.round(total * 0.3), total);
  }
  if (charge === "balance") return balance;
  return balance > 0 ? balance : total;
}

/** Acciones de cobro disponibles según modo y montos. */
export function availableLaundryCharges(
  reception: LaundryReception,
): Array<{ charge: LaundryCheckoutCharge; label: string; amount: number }> {
  const balance = Math.max(
    0,
    Math.round(Number(reception.servicesTotal) || 0) -
      Math.round(Number(reception.paidAmount) || 0),
  );
  if (balance <= 0) return [];

  const paid = Math.round(Number(reception.paidAmount) || 0);
  const deposit = Math.round(Number(reception.depositAmount) || 0);
  const out: Array<{ charge: LaundryCheckoutCharge; label: string; amount: number }> =
    [];

  if (reception.paymentMode === "DEPOSIT_THEN_BALANCE" && paid < deposit) {
    const amount = resolveLaundryChargeAmount(reception, "deposit");
    if (amount > 0) {
      out.push({ charge: "deposit", label: "Cobrar abono", amount });
    }
    return out;
  }

  if (reception.paymentMode === "DEPOSIT_THEN_BALANCE" && paid > 0) {
    out.push({
      charge: "balance",
      label: "Cobrar saldo",
      amount: resolveLaundryChargeAmount(reception, "balance"),
    });
    return out;
  }

  out.push({
    charge: "full",
    label: "Cobrar guía",
    amount: resolveLaundryChargeAmount(reception, "full"),
  });
  return out;
}

/**
 * Arma líneas de carrito para el cobro.
 * - full: líneas SERVICE del catálogo POS × cantidades de la guía
 * - deposit/balance: una línea con el monto a cobrar (sin IVA en el bridge)
 */
export function laundryReceptionToCartLines(
  reception: LaundryReception,
  catalogItems: PosProductSearchItem[],
  charge: LaundryCheckoutCharge,
): PosCartLine[] {
  const amount = resolveLaundryChargeAmount(reception, charge);
  if (amount <= 0) return [];

  const byVariant = new Map(catalogItems.map((item) => [item.variantId, item]));
  const serviceLines =
    reception.garments?.flatMap((g) => g.serviceLines ?? []) ?? [];

  if (charge === "full" && serviceLines.length > 0) {
    const qtyByVariant = new Map<string, number>();
    for (const garment of reception.garments ?? []) {
      const garmentQty = Number(garment.quantity) || 0;
      if (garmentQty <= 0) continue;
      for (const line of garment.serviceLines ?? []) {
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
          laundryReceptionId: reception.id,
          laundryCharge: charge,
        },
      });
    }
    if (cartLines.length > 0) return cartLines;
  }

  // Deposit / balance / fallback: una línea con el monto a cobrar.
  const firstVariantId =
    serviceLines.find((l) => l.productVariantId)?.productVariantId ??
    catalogItems[0]?.variantId;
  if (!firstVariantId) return [];
  const item = byVariant.get(firstVariantId) ?? catalogItems[0];
  if (!item) return [];

  const code = reception.code?.trim() || reception.id.slice(0, 8);
  const label =
    charge === "deposit"
      ? `Abono lavandería ${code}`
      : charge === "balance"
        ? `Saldo lavandería ${code}`
        : `Lavandería ${code}`;

  const base: PosCartLine = {
    ...item,
    productName: label,
    quantity: 1,
    unitTaxRate: 0,
    metadata: {
      ...(item.metadata ?? {}),
      sourceLaundryReception: true,
      laundryReceptionId: reception.id,
      laundryCharge: charge,
    },
  };
  return [applyUnitGrossPriceToCartLine(base, amount)];
}

export function laundryCartLinesTotal(lines: PosCartLine[]): number {
  return lines.reduce(
    (sum, line) =>
      sum + Math.round((Number(line.quantity) || 0) * (Number(line.unitPriceWithTax) || 0)),
    0,
  );
}
