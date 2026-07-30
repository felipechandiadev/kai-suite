export type EShopFeaturedProductItem = {
  id: string;
  name: string;
  brand: string | null;
  categoryName: string | null;
  visibleInEShop: boolean;
  isActive: boolean;
  variantCount: number;
  imageUrl: string | null;
};

export type EShopFeaturedProductsState = {
  productIds: string[];
  items: EShopFeaturedProductItem[];
};

export type EShopFeaturedProductSearchResult = {
  rows: import("@/features/inventory-products/types/product-grid.types").ProductGridRow[];
  total: number;
  page: number;
  pageSize: number;
};
