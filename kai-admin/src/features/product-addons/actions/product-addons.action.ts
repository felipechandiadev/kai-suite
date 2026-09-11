"use server";

import { revalidatePath } from "next/cache";
import { ProductAddonsRequest } from "../infrastructure/product-addons.request";

const PRODUCTS_PATH = "/catalog/products";

export async function listProductAddonsAction(hostProductId: string) {
  return ProductAddonsRequest.list(hostProductId);
}

export async function addProductAddonAction(hostProductId: string, addonProductId: string) {
  const row = await ProductAddonsRequest.add(hostProductId, addonProductId);
  revalidatePath(PRODUCTS_PATH);
  return row;
}

export async function removeProductAddonAction(hostProductId: string, addonProductId: string) {
  await ProductAddonsRequest.remove(hostProductId, addonProductId);
  revalidatePath(PRODUCTS_PATH);
}

export async function searchAgregadoProductsAction(input: { q?: string; categoryId?: string }) {
  return ProductAddonsRequest.searchAgregados(input);
}
