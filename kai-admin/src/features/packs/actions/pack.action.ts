"use server";

import { revalidatePath } from "next/cache";
import { PackRequest } from "../infrastructure/pack.request";
import type { PackLineDto } from "../infrastructure/pack.request";

const PRODUCTS_PATH = "/catalog/products";

export async function getPackCompositionAction(
  variantId: string,
): Promise<{ lines: PackLineDto[]; error?: string }> {
  try {
    const data = await PackRequest.getComposition(variantId);
    return { lines: data.lines ?? [] };
  } catch (error) {
    return {
      lines: [],
      error: error instanceof Error ? error.message : "No se pudo cargar composición pack",
    };
  }
}

export async function upsertPackCompositionAction(input: {
  variantId: string;
  lines: Array<{ inputVariantId: string; qtyPerOutputUnit: number; sortOrder?: number }>;
}) {
  const result = await PackRequest.upsertComposition(input.variantId, input.lines);
  revalidatePath(PRODUCTS_PATH);
  return result;
}

export async function getPackPmpSummaryAction(variantId: string) {
  return PackRequest.pmpSummary(variantId);
}
