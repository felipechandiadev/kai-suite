export type PurchaseSuggestionItem = {
  productId: string;
  productVariantId: string;
  productName: string;
  sku: string;
  attributeValues: Record<string, string> | null;
  reason: "BELOW_MINIMUM" | "REORDER";
  currentStock: number;
  onOrder: number;
  minimumStock: number | null;
  reorderPoint: number | null;
  targetStock: number;
  suggestedQuantity: number;
  lastUnitCost: number | null;
  estimatedUnitCost: number;
  defaultTaxIds: string[];
};

export type PurchaseSuggestionGroup = {
  supplierId: string | null;
  supplierName: string;
  items: PurchaseSuggestionItem[];
  estimatedNetTotal: number;
};

export type SuggestionOrderLineInput = {
  productId: string;
  productVariantId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxIds: string[];
};

export type CreateOrderFromSuggestionsInput = {
  supplierId: string;
  lines: SuggestionOrderLineInput[];
};

export type CreateOrderFromSuggestionsResult =
  | { success: true; id: string; documentNumber?: string }
  | { success: false; error: string };
