"use server";

import { revalidatePath } from "next/cache";
import {
  VariantProductionRequest,
  type VariantBranchAvailabilityItem,
  type VariantProductionUnitRoutingItem,
} from "../infrastructure/variant-production.request";

export async function getVariantProductionRoutingAction(variantId: string) {
  return VariantProductionRequest.listRouting(variantId);
}

export async function saveVariantProductionRoutingAction(
  variantId: string,
  items: VariantProductionUnitRoutingItem[],
) {
  const result = await VariantProductionRequest.upsertRouting(variantId, items);
  if (result.success) {
    revalidatePath(`/catalog/products/variants/${variantId}`, "page");
  }
  return result;
}

export async function getVariantBranchAvailabilityAction(variantId: string) {
  return VariantProductionRequest.listAvailability(variantId);
}

export async function saveVariantBranchAvailabilityAction(
  variantId: string,
  items: VariantBranchAvailabilityItem[],
) {
  const result = await VariantProductionRequest.upsertAvailability(variantId, items);
  if (result.success) {
    revalidatePath(`/catalog/products/variants/${variantId}`, "page");
  }
  return result;
}
