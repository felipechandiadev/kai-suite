"use server";

import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { resolveMultimediaPublicUrl } from "@/lib/resolve-multimedia-public-url";
import { EShopRequest } from "@/features/e-shop-storefront/infrastructure/eshop.request";
import type { EShopProductCard } from "@/features/e-shop-storefront/types/storefront.types";
import type { EShopCatalogListResult, EShopCatalogQuery } from "../types/catalog.types";

function mapProductCard(product: EShopProductCard): EShopProductCard {
  return {
    ...product,
    imageUrl: resolveMultimediaPublicUrl(product.imageUrl),
  };
}

export async function getCatalogAction(
  opts?: EShopCatalogQuery,
): Promise<EShopCatalogListResult> {
  const params = new URLSearchParams();
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  if (opts?.categoryId?.trim()) params.set("categoryId", opts.categoryId.trim());
  if (opts?.excludeProductIds?.length) {
    params.set("excludeIds", opts.excludeProductIds.join(","));
  }

  const qs = params.toString();
  const data = await EShopRequest.get<EShopCatalogListResult>(
    getEShopStoreSlug(),
    `/e-shop/catalog${qs ? `?${qs}` : ""}`,
  );

  return {
    ...data,
    items: data.items.map(mapProductCard),
  };
}
