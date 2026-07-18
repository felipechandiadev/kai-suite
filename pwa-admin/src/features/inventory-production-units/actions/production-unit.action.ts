"use server";

import { revalidatePath } from "next/cache";
import { ProductionUnitRequest } from "../infrastructure/production-unit.request";
import type {
  CreateProductionUnitInput,
  ProductionUnitActionResult,
  ProductionUnitListItem,
  UpdateProductionUnitInput,
} from "../types/production-unit.types";

const PATH = "/production/units";

export async function listProductionUnitsForPage(
  branchId?: string,
): Promise<ProductionUnitListItem[]> {
  return ProductionUnitRequest.list(branchId);
}

export async function createProductionUnitAction(
  input: CreateProductionUnitInput,
): Promise<ProductionUnitActionResult> {
  try {
    const unit = await ProductionUnitRequest.create(input);
    if (!unit) return { success: false, message: "No se pudo crear la unidad." };
    revalidatePath(PATH, "page");
    return { success: true, unit };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "No se pudo crear la unidad.",
    };
  }
}

export async function updateProductionUnitAction(
  input: UpdateProductionUnitInput,
): Promise<ProductionUnitActionResult> {
  try {
    const { id, ...rest } = input;
    const unit = await ProductionUnitRequest.update(id, rest);
    if (!unit) return { success: false, message: "No se pudo actualizar la unidad." };
    revalidatePath(PATH, "page");
    return { success: true, unit };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "No se pudo actualizar la unidad.",
    };
  }
}
