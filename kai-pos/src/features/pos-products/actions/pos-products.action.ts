"use server";

import { ProductsPosRequest } from "../infrastructure/products-pos.request";

export async function searchPosProductsAction(input: {
  query?: string;
  priceListId: string;
  branchId?: string | null;
  pointOfSaleId?: string | null;
  productTypes?: string[];
  categoryIds?: string[];
  page: number;
  pageSize: number;
}) {
  return ProductsPosRequest.search(input);
}

export async function lookupPosVariantsAction(input: {
  variantIds: string[];
  pointOfSaleId?: string | null;
  branchId?: string | null;
  priceListId?: string | null;
}) {
  return ProductsPosRequest.lookupVariants(input);
}

export async function getPosVariantStockAction(input: { variantId: string; pointOfSaleId: string }) {
  return ProductsPosRequest.getVariantStock(input);
}

export async function getPosVariantStockBreakdownAction(input: {
  variantId: string;
  pointOfSaleId?: string;
}) {
  return ProductsPosRequest.getVariantStockBreakdown(input);
}
