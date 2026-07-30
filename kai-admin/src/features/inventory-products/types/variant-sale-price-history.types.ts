/** `GET /product-variants/:id/sale-price-history` */

export type SalePriceHistorySource = "variant_create" | "catalog_edit";

export type VariantSalePriceHistoryEntry = {
  at: string;
  source: SalePriceHistorySource;
  userId?: string;
  /** Nombre para mostrar (resuelto en API). */
  userDisplayName?: string;
  priceListId?: string;
  priceListName?: string;
  previousNet?: number;
  newNet?: number;
  previousGross?: number;
  newGross?: number;
  previousTaxIds?: string[] | null;
  newTaxIds?: string[] | null;
  previousBasePrice?: number;
  newBasePrice?: number;
};

export type VariantSalePriceHistoryResponse = {
  variant: {
    id: string;
    productName: string;
    sku: string;
    attributeValues: Record<string, string>;
    basePrice: number;
  };
  items: VariantSalePriceHistoryEntry[];
};
