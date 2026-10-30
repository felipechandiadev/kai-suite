"use server";

import { revalidatePath } from "next/cache";
import { createPurchaseOrderAction } from "@/features/purchasing-document/actions/purchase-order.action";
import { listSuppliersForGrid } from "@/features/purchasing-suppliers/actions/supplier.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { PurchaseSuggestionsRequest } from "../infrastructure/purchase-suggestions.request";
import type {
  CreateOrderFromSuggestionsInput,
  CreateOrderFromSuggestionsResult,
  PurchaseSuggestionGroup,
} from "../types/purchase-suggestions.types";

export type SupplierOption = { id: string; label: string };

function supplierLabel(s: {
  alias?: string | null;
  person?: { businessName?: string | null; firstName?: string | null; lastName?: string | null } | null;
}): string {
  const alias = s.alias?.trim();
  if (alias) return alias;
  const business = s.person?.businessName?.trim();
  if (business) return business;
  return [s.person?.firstName, s.person?.lastName].filter(Boolean).join(" ").trim() || "Proveedor";
}

export async function listPurchaseSuggestionsForPage(): Promise<{
  groups: PurchaseSuggestionGroup[];
  suppliers: SupplierOption[];
}> {
  const [groups, suppliers] = await Promise.all([
    PurchaseSuggestionsRequest.list(),
    listSuppliersForGrid(),
  ]);
  return {
    groups,
    suppliers: suppliers.rows
      .filter((s) => s.isActive !== false)
      .map((s) => ({ id: s.id, label: supplierLabel(s) }))
      .sort((a, b) => a.label.localeCompare(b.label, "es")),
  };
}

/** Crea una orden de compra confirmada a partir de las líneas elegidas (sucursal: casa matriz o primera activa). */
export async function createPurchaseOrderFromSuggestionsAction(
  input: CreateOrderFromSuggestionsInput,
): Promise<CreateOrderFromSuggestionsResult> {
  if (!input.supplierId?.trim()) {
    return { success: false, error: "Seleccione un proveedor." };
  }
  const lines = (input.lines ?? []).filter((l) => l.quantity > 0);
  if (lines.length === 0) {
    return { success: false, error: "Seleccione al menos una línea con cantidad mayor a 0." };
  }
  const branches = await listBranchesForSettingsPage();
  const branch =
    branches.find((b) => b.isHeadquarters && b.isActive !== false) ??
    branches.find((b) => b.isActive !== false) ??
    branches[0];
  if (!branch) {
    return { success: false, error: "No hay una sucursal para asociar la orden." };
  }

  const result = await createPurchaseOrderAction({
    branchId: branch.id,
    supplierId: input.supplierId,
    documentDate: new Date().toISOString().slice(0, 10),
    notes: "Generada desde «Qué comprar»",
    lines: lines.map((l) => ({
      productId: l.productId,
      variantId: l.productVariantId,
      productName: l.productName,
      sku: l.sku,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxIds: l.taxIds,
    })),
  });
  if (result.success) {
    revalidatePath("/purchasing/transactions/suggestions", "page");
  }
  return result;
}
