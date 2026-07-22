export type VariantPriceListItem = {
  priceListId: string;
  priceListName: string;
  currency: string;
  netPrice: number;
  grossPrice: number;
  taxIds?: string[];
  maxDiscountPercent?: number | null;
  minPrice?: number | null;
};

export type UpdateVariantPricingInput = {
  productId: string;
  basePrice: number;
  priceListItems: Array<{
    priceListId: string;
    netPrice: number;
    grossPrice: number;
    taxIds?: string[];
    maxDiscountPercent?: number | null;
    minPrice?: number | null;
  }>;
};
