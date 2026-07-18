"use server";

import { revalidatePath } from "next/cache";
import { PurchasingVariantSearchRequest } from "@/features/purchasing-document/infrastructure/purchasing-variant-search.request";
import type { PurchasingVariantSearchResult } from "@/features/purchasing-document/types/purchasing-document.types";
import { RecipeRequest, type CreateRecipePayload } from "../infrastructure/recipe.request";
import { RecipeCtpRequest } from "../infrastructure/recipe-ctp.request";
import type { RecipeCtpDetailResponse } from "../types/recipe-ctp.types";
import type { RecipeDto, RecipeTypeDto } from "../types/recipe.types";

const PRODUCTS_PATH = "/catalog/products";

/** Misma API que recepciones / órdenes de compra (`product-variants/purchasing-search`). */
export async function searchRecipeVariantCatalogAction(
  q: string,
  page: number,
): Promise<PurchasingVariantSearchResult> {
  return PurchasingVariantSearchRequest.search({
    q: q.trim(),
    page: Math.max(1, page),
    pageSize: 10,
  });
}

export async function listRecipesByOutputVariantAction(outputVariantId: string): Promise<RecipeDto[]> {
  const id = outputVariantId?.trim() ?? "";
  if (!id) {
    return [];
  }
  return RecipeRequest.list(id);
}

export async function getRecipeCtpDetailAction(input: {
  variantId: string;
  branchId: string;
}): Promise<RecipeCtpDetailResponse> {
  return RecipeCtpRequest.detail(input);
}

export type CreateRecipeFormInput = {
  outputVariantId: string;
  recipeType: RecipeTypeDto;
  version: number;
  lines: Array<{
    inputVariantId: string;
    qtyPerOutputUnit: number;
    wasteFactor?: number;
    limitsProjectedStock?: boolean;
  }>;
};

export type CreateRecipeResult = { success: true; id: string } | { success: false; error: string };

function normalizeRecipeLinesInput(
  lines: CreateRecipeFormInput["lines"],
): { ok: true; lines: CreateRecipePayload["lines"] } | { ok: false; error: string } {
  if (!lines?.length) {
    return { ok: false, error: "Agregue al menos una línea de insumo" };
  }
  const normalized = lines.map((l, i) => ({
    inputVariantId: l.inputVariantId.trim(),
    qtyPerOutputUnit: l.qtyPerOutputUnit,
    wasteFactor: l.wasteFactor ?? 0,
    limitsProjectedStock: l.limitsProjectedStock !== false,
    sortOrder: i + 1,
  }));
  for (const l of normalized) {
    if (!l.inputVariantId) {
      return { ok: false, error: "Cada línea debe tener un insumo (variante)" };
    }
    if (!Number.isFinite(l.qtyPerOutputUnit) || l.qtyPerOutputUnit <= 0) {
      return { ok: false, error: "La cantidad por unidad producida debe ser mayor que cero" };
    }
  }
  return { ok: true, lines: normalized };
}

function revalidateRecipePaths(outputVariantId: string) {
  revalidatePath(PRODUCTS_PATH, "page");
  revalidatePath(`/catalog/products/variants/${outputVariantId}`, "page");
}

export async function createRecipeAction(input: CreateRecipeFormInput): Promise<CreateRecipeResult> {
  const outputVariantId = input.outputVariantId?.trim() ?? "";
  if (!outputVariantId) {
    return { success: false, error: "Variante de salida no válida" };
  }
  const normalized = normalizeRecipeLinesInput(input.lines);
  if (!normalized.ok) {
    return { success: false, error: normalized.error };
  }
  const version = Math.max(1, Math.floor(Number(input.version) || 1));
  const payload: CreateRecipePayload = {
    outputVariantId,
    type: input.recipeType,
    version,
    isActive: true,
    lines: normalized.lines,
  };
  const r = await RecipeRequest.create(payload);
  if (r.success) {
    revalidateRecipePaths(outputVariantId);
  }
  return r;
}

export type UpdateRecipeFormInput = CreateRecipeFormInput & {
  recipeId: string;
};

export async function updateRecipeAction(input: UpdateRecipeFormInput): Promise<CreateRecipeResult> {
  const recipeId = input.recipeId?.trim() ?? "";
  const outputVariantId = input.outputVariantId?.trim() ?? "";
  if (!recipeId) {
    return { success: false, error: "Receta no válida" };
  }
  if (!outputVariantId) {
    return { success: false, error: "Variante de salida no válida" };
  }
  const normalized = normalizeRecipeLinesInput(input.lines);
  if (!normalized.ok) {
    return { success: false, error: normalized.error };
  }
  const version = Math.max(1, Math.floor(Number(input.version) || 1));
  const payload: CreateRecipePayload = {
    outputVariantId,
    type: input.recipeType,
    version,
    isActive: true,
    lines: normalized.lines,
  };
  const r = await RecipeRequest.update(recipeId, payload);
  if (r.success) {
    revalidateRecipePaths(outputVariantId);
  }
  return r;
}
