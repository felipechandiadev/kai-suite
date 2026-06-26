import type { VariantPriceListItem } from "@/features/variant-pricing/types/pricing.types";
import type { VariantMediaAsset } from "@/features/variant-multimedia/types/multimedia.types";

export type VariantLookupItem = {
  variantId: string;
  sku: string;
  barcode: string | null;
  productName: string;
  attributeValues: Record<string, string>;
};

export type VariantDetail = VariantLookupItem & {
  productId: string | null;
  unitOfMeasure: string;
  pmp: number | null;
  priceListItems: VariantPriceListItem[];
  mediaAssets?: VariantMediaAsset[];
};
