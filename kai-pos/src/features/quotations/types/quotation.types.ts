export type QuotationEffectiveStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CONVERTED"
  | "CANCELLED";

export interface QuotationLineRow {
  id: string;
  lineNumber: number;
  productId: string | null;
  productVariantId: string | null;
  productName: string;
  productSku: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  notes: string | null;
}

export interface QuotationDetail {
  id: string;
  companyId: string;
  documentNumber: string;
  status: string;
  effectiveStatus: QuotationEffectiveStatus;
  branchId: string | null;
  pointOfSaleId: string | null;
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  total: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  currency: string;
  issuedAt: string;
  validUntil: string;
  validityDays: number;
  terms: string | null;
  priceListId: string | null;
  convertedToTransactionId: string | null;
  convertedToDocumentNumber: string | null;
  convertedAt: string | null;
  notes: string | null;
  createdAt: string;
  lines: QuotationLineRow[];
}
