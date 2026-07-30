export type EShopCatalogMultimediaItem = {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
  isPrimary?: boolean;
};

export type EShopCatalogProductVariant = {
  id: string;
  sku: string;
  attributeValues: Record<string, string>;
  basePrice: number;
  inStock: boolean;
  /** Cantidad disponible; null si la variante no controla inventario. */
  availableStock: number | null;
  trackInventory: boolean;
  multimedia: EShopCatalogMultimediaItem[];
};

export type EShopCatalogProductDetail = {
  product: {
    id: string;
    name: string;
    brand: string | null;
    categoryName: string | null;
    description: string | null;
    productType: string;
    multimedia: EShopCatalogMultimediaItem[];
  };
  variants: EShopCatalogProductVariant[];
  attributeOptions: Record<string, string[]>;
  defaultVariantId: string | null;
  /** Almacén usado para calcular stock (vista previa admin). */
  previewStorageName?: string | null;
};
