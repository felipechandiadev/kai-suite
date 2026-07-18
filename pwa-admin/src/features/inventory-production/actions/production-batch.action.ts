"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth/auth-options";
import { ProductRequest } from "@/features/inventory-products/infrastructure/product.request";
import { listRecipesByOutputVariantAction } from "@/features/recipes/actions/recipe.action";
import { ProductionBatchRequest } from "../infrastructure/production-batch.request";
import type {
  CreateProductionBatchInput,
  ListProductionBatchesParams,
  ProductionBatchDetail,
  ProductionBatchListItem,
} from "../types/production-batch.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PATH = "/production/orders";

function revalidateProduction() {
  revalidatePath(PATH, "page");
  revalidatePath("/production/units", "page");
}

export async function listProductionBatchesAction(
  params: ListProductionBatchesParams = {},
): Promise<{ data: ProductionBatchListItem[]; total: number }> {
  const result = await ProductionBatchRequest.list(params);
  return { data: result.data, total: result.total };
}

export async function getProductionBatchAction(
  id: string,
): Promise<ProductionBatchDetail | null> {
  return ProductionBatchRequest.getById(id);
}

export async function createProductionBatchAction(
  input: CreateProductionBatchInput,
): Promise<{ success: true; batch: ProductionBatchDetail } | { success: false; message: string }> {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.accessToken || session?.user?.id || "").trim();
  if (!UUID_RE.test(userId)) {
    return { success: false, message: "Sesión inválida: reinicie sesión" };
  }
  try {
    const batch = await ProductionBatchRequest.create({ ...input, userId });
    revalidateProduction();
    return { success: true, batch };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Error al crear" };
  }
}

export async function completeProductionBatchAction(
  id: string,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    await ProductionBatchRequest.complete(id);
    revalidateProduction();
    revalidatePath(`${PATH}/${id}`, "page");
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Error al completar" };
  }
}

export async function cancelProductionBatchAction(
  id: string,
): Promise<{ success: true; batch: ProductionBatchDetail } | { success: false; message: string }> {
  try {
    const batch = await ProductionBatchRequest.cancel(id);
    revalidateProduction();
    revalidatePath(`${PATH}/${id}`, "page");
    return { success: true, batch };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Error al cancelar" };
  }
}

const FINISHED = new Set(["MANUFACTURADO", "ELABORADO", "PREPARADO"]);

export async function searchFinishedVariantsAction(q: string): Promise<
  Array<{
    variantId: string;
    sku: string;
    productName: string;
    productType: string;
  }>
> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const types = ["MANUFACTURADO", "ELABORADO", "PREPARADO"] as const;
  const results = await Promise.all(
    types.map((t) => ProductRequest.searchProducts(trimmed, 20, t)),
  );
  const out: Array<{
    variantId: string;
    sku: string;
    productName: string;
    productType: string;
  }> = [];
  for (const products of results) {
    for (const p of products) {
      const pt = String(p.productType ?? "").toUpperCase();
      if (!FINISHED.has(pt)) continue;
      for (const v of p.variants ?? []) {
        out.push({
          variantId: v.id,
          sku: v.sku,
          productName: p.name,
          productType: pt,
        });
      }
    }
  }
  return out.slice(0, 30);
}

export async function previewRecipeInputsAction(
  outputVariantId: string,
  outputQty: number,
): Promise<
  | {
      success: true;
      recipeId: string;
      lines: Array<{
        inputVariantId: string;
        qtyPerOutputUnit: number;
        wasteFactor: number;
        requiredQty: number;
      }>;
    }
  | { success: false; message: string }
> {
  const recipes = await listRecipesByOutputVariantAction(outputVariantId);
  const recipe = recipes.find((r) => r.isActive && r.type === "PRODUCTION");
  if (!recipe) {
    return { success: false, message: "No hay receta PRODUCTION activa" };
  }
  const qty = Number(outputQty);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { success: false, message: "Cantidad inválida" };
  }
  return {
    success: true,
    recipeId: recipe.id,
    lines: (recipe.lines ?? []).map((l) => {
      const per = Number(l.qtyPerOutputUnit ?? 0);
      const waste = Number(l.wasteFactor ?? 0);
      return {
        inputVariantId: l.inputVariantId,
        qtyPerOutputUnit: per,
        wasteFactor: waste,
        requiredQty: (per + waste) * qty,
      };
    }),
  };
}
