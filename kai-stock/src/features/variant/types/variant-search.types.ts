/** Fila devuelta por `GET /product-variants/purchasing-search`. */
export type VariantSearchItem = {
  id: string;
  productId: string;
  productName: string;
  categoryName: string | null;
  sku: string;
  barcode: string | null;
  pmp: number | null;
  attributeValues: Record<string, string>;
  unitLabel: string | null;
};

export type VariantSearchResult = {
  items: VariantSearchItem[];
  page: number;
  pageSize: number;
  total: number;
  unauthorized?: boolean;
};
