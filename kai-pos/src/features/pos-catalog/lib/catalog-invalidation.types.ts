export type CatalogInvalidationKind =
  | "RECIPE"
  | "PRICE"
  | "PRODUCT"
  | "VARIANT";

export type CatalogInvalidatedPayload = {
  companyId: string;
  kinds: CatalogInvalidationKind[];
  variantIds?: string[];
  productIds?: string[];
  priceListIds?: string[];
  recipeId?: string;
  at: string;
};

export type CatalogRefreshListener = (payload: CatalogInvalidatedPayload) => void;
