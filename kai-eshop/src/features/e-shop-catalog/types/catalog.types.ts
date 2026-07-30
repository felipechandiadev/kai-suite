import type { EShopProductCard } from "@/features/e-shop-storefront/types/storefront.types";

export type EShopCatalogCategoryOption = {
  id: string;
  name: string;
};

export type EShopCatalogListResult = {
  items: EShopProductCard[];
  total: number;
  totalGeneral: number;
  page: number;
  limit: number;
  categories: EShopCatalogCategoryOption[];
};

export type EShopCatalogQuery = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  excludeProductIds?: string[];
};
