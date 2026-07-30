"use server";

import { revalidateVariantPaths } from "@/features/variant/lib/revalidate-variant-paths";
import { PriceListRequest } from "../infrastructure/price-list.request";
import { TaxRequest } from "../infrastructure/tax.request";
import { VariantPricingRequest } from "../infrastructure/variant-pricing.request";
import type { UpdateVariantPricingInput } from "../types/pricing.types";
import type { PriceListListItem } from "../types/price-list.types";
import type { TaxListItem } from "../types/tax.types";

export async function listPriceListsForStockAction(): Promise<
  { success: true; priceLists: PriceListListItem[] } | { success: false; error: string }
> {
  return PriceListRequest.findAll();
}

export async function listTaxesForStockAction(): Promise<
  { success: true; taxes: TaxListItem[] } | { success: false; error: string }
> {
  return TaxRequest.findAll();
}

export async function updateVariantPricingAction(
  variantId: string,
  input: UpdateVariantPricingInput,
): Promise<
  { success: true } | { success: false; error: string; unauthorized?: boolean }
> {
  const items = input.priceListItems;
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Debe indicar al menos un precio por lista." };
  }
  const seen = new Set<string>();
  for (const it of items) {
    const lid = it.priceListId?.trim() ?? "";
    if (!lid) {
      return { success: false, error: "Cada precio debe tener una lista de precios." };
    }
    if (seen.has(lid)) {
      return { success: false, error: "No puede repetir la misma lista de precios." };
    }
    seen.add(lid);
  }
  const r = await VariantPricingRequest.updatePricing(variantId, input);
  if (r.success) {
    revalidateVariantPaths(variantId);
    return { success: true };
  }
  return { success: false, error: r.error, unauthorized: r.unauthorized };
}
