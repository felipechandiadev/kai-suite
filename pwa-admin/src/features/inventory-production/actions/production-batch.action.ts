"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth/auth-options";
import { VariantProductionRequest } from "@/features/inventory-products/infrastructure/variant-production.request";
import type { ProductionAttribute } from "@/features/inventory-products/types/production-attributes.types";
import { ProductionBatchRequest } from "../infrastructure/production-batch.request";
import type {
  CreateProductionBatchInput,
  ListProductionBatchesParams,
  ManufactureVariantSearchItem,
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
  if (!input.lots?.length) {
    return { success: false, message: "Agregue al menos un lote" };
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

export async function searchManufactureVariantsAction(params: {
  q: string;
  productionUnitId: string;
}): Promise<ManufactureVariantSearchItem[]> {
  if (!params.productionUnitId) return [];
  return ProductionBatchRequest.searchManufactureVariants({
    q: params.q.trim(),
    productionUnitId: params.productionUnitId,
    limit: 30,
  });
}

export async function listVariantProductionAttributesAction(
  variantId: string,
): Promise<ProductionAttribute[]> {
  if (!UUID_RE.test(variantId.trim())) return [];
  return VariantProductionRequest.listProductionAttributes(variantId.trim());
}
