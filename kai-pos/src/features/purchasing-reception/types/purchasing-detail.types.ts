export type PurchasingTransactionDetailLine = {
  id: string;
  productId?: string | null;
  productVariantId?: string | null;
  productName: string;
  productSku?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  total: number;
  taxId?: string | null;
};

export type PurchasingTransactionDetail = {
  id: string;
  documentNumber: string;
  transactionType: string;
  status: string;
  createdAt: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  documentFolio?: string | null;
  externalReference?: string | null;
  notes?: string | null;
  supplierId?: string | null;
  storageId?: string | null;
  supplierLabel?: string | null;
  metadata?: Record<string, unknown> | null;
  receptionId?: string | null;
  lines: PurchasingTransactionDetailLine[];
};

export type PurchasingTransactionDetailResult =
  | { success: true; data: PurchasingTransactionDetail }
  | { success: false; error: string };
