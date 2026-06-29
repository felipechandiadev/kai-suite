"use server";

import { lookupVariantUseCase } from "../application/lookup-variant.usecase";
import { revalidateVariantPaths } from "../lib/revalidate-variant-paths";
import { updateBarcodeUseCase } from "../application/update-barcode.usecase";
import { VariantRequest } from "../infrastructure/variant.request";
import type { ScanMode } from "../domain/scan-mode.entity";
import type { VariantDetail, VariantLookupItem } from "../types/variant.types";

export async function lookupVariantAction(input: {
  code: string;
  mode: ScanMode;
}): Promise<
  | { success: true; items: VariantLookupItem[] }
  | { success: false; error: string; unauthorized?: boolean }
> {
  const r = await lookupVariantUseCase(input);
  if (!r.ok) return { success: false, error: r.error, unauthorized: r.unauthorized };
  return { success: true, items: r.items };
}

export async function getVariantDetailAction(
  variantId: string,
): Promise<
  | { success: true; variant: VariantDetail }
  | { success: false; error: string; unauthorized?: boolean }
> {
  return VariantRequest.getById(variantId.trim());
}

export async function updateVariantInventoryPartialAction(
  variantId: string,
  input: {
    trackInventory: boolean;
    allowNegativeStock: boolean;
    minimumStock: number;
    minimumStockEnabled: boolean;
    maximumStock: number;
    maximumStockEnabled: boolean;
    reorderPoint: number;
    reorderPointEnabled: boolean;
  },
): Promise<{ success: true } | { success: false; error: string; unauthorized?: boolean }> {
  const r = await VariantRequest.updateInventoryPartial(variantId, input);
  if (r.success) {
    revalidateVariantPaths(variantId.trim());
  }
  return r;
}

export async function updateBarcodeAction(input: {
  variantId: string;
  barcode: string;
}): Promise<{ success: true } | { success: false; error: string; unauthorized?: boolean }> {
  const r = await updateBarcodeUseCase(input);
  if (!r.ok) return { success: false, error: r.error, unauthorized: r.unauthorized };
  revalidateVariantPaths();
  return { success: true };
}
