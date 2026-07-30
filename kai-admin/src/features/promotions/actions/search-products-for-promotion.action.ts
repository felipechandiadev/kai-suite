"use server";

import { ProductRequest } from "@/features/inventory-products/infrastructure/product.request";
import type { ProductGridRow } from "@/features/inventory-products/types/product-grid.types";

export async function searchProductsForPromotionAction(
  query: string,
): Promise<ProductGridRow[]> {
  return ProductRequest.searchProducts(query, 30);
}

export async function getProductForPromotionAction(
  productId: string,
): Promise<ProductGridRow | null> {
  return ProductRequest.getProductForGridById(productId);
}
