import { ProductType } from '@modules/products/domain/product.entity';

export type SeedUnitKey = 'UN' | 'ML' | 'L' | 'G' | 'KG';

export type SeedVariantDefinition = {
  sku: string;
  barcode?: string;
  /** Precio de venta; omitir o 0 para INSUMO. */
  basePrice?: number;
  baseCost: number;
  trackInventory: boolean;
  allowNegativeStock?: boolean;
  /** Omitir para INSUMO (sin listas de precios). */
  retailNet?: number;
  wholesaleNet?: number;
  inBothPriceLists?: boolean;
  uom?: { stock: SeedUnitKey; sale: SeedUnitKey; purchase: SeedUnitKey };
  attributeValues?: Record<string, string>;
  shipping?: {
    netWeightKg: number;
    grossWeightKg: number;
    packageLengthCm: number;
    packageWidthCm: number;
    packageHeightCm: number;
    volumetricDivisorK?: number;
  };
};

export type SeedProductDefinition = {
  name: string;
  brand: string;
  description?: string;
  productType: ProductType;
  categoryName: string;
  productBaseUnit?: SeedUnitKey;
  visibleInEShop?: boolean;
  variants: SeedVariantDefinition[];
};

export type SeedAttributeDefinition = {
  name: string;
  options: readonly string[];
  displayOrder: number;
};
