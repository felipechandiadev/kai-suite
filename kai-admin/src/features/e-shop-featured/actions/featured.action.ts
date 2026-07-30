"use server";

import { revalidatePath } from "next/cache";
import {
  listProductsForGrid,
  type ListProductsForGridResult,
} from "@/features/inventory-products/actions/product.action";
import type { ProductGridRow } from "@/features/inventory-products/types/product-grid.types";
import { EShopFeaturedRequest } from "../infrastructure/eshop-featured.request";
import type { EShopFeaturedProductsState } from "../types/featured.types";

const FEATURED_PATH = "/e-shop/featured";

function isEshopEligibleProduct(row: ProductGridRow): boolean {
  if (row.isActive === false || row.visibleInEShop !== true) {
    return false;
  }
  return (row.variants ?? []).some((v) => v.visibleInEShop === true && v.isActive !== false);
}

export async function listFeaturedProductsAction(): Promise<EShopFeaturedProductsState> {
  return EShopFeaturedRequest.listFeaturedProducts();
}

export async function listProductsForFeaturedSearchAction(input: {
  query?: string;
  page: number;
  pageSize: number;
}): Promise<ListProductsForGridResult> {
  const page = Math.max(1, input.page);
  const limit = Math.min(50, Math.max(5, input.pageSize));
  const all = await listProductsForGrid({
    query: input.query?.trim() ?? "",
    page: 1,
    limit: 500,
    sortField: "name",
    sort: "asc",
  });

  const eligible = all.rows.filter(isEshopEligibleProduct);
  const total = eligible.length;
  const start = (page - 1) * limit;
  const rows = eligible.slice(start, start + limit);

  return { rows, total, page, limit };
}

export async function saveFeaturedProductIdsAction(productIds: string[]) {
  const res = await EShopFeaturedRequest.replaceFeaturedProductIds(productIds);
  if (res.success) {
    revalidatePath(FEATURED_PATH, "page");
  }
  return res;
}
