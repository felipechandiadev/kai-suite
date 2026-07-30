export type SupplierHonorariumReceiptLinkInfo = {
  purchaseOrderId?: string | null;
  receptionId?: string | null;
  stockInTransactionId?: string | null;
};

export type SupplierHonorariumReceiptLine = {
  productId?: string;
  productVariantId?: string;
  productName?: string;
  productSku?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  subtotal?: number;
  lineNumber?: number;
  taxId?: string;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
};

export type CreateSupplierHonorariumReceiptInput = {
  branchId: string;
  userId?: string;
  supplierId: string;
  storageId?: string | null;
  dteNumber?: string | null;
  externalReference?: string | null;
  notes?: string | null;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  paymentStatus?: "PENDING" | "PARTIAL" | "PAID";
  amountPaid?: number;
  relatedTransactionId?: string | null;
  links?: SupplierHonorariumReceiptLinkInfo;
  lines: SupplierHonorariumReceiptLine[];
};

export type SupplierHonorariumReceiptListItem = {
  id: string;
  documentNumber?: string | null;
  transactionType: "SUPPLIER_HONORARIUM_RECEIPT";
  status: string;
  subtotal?: number;
  total: number;
  createdAt: string;
  documentFolio?: string | null;
  externalReference?: string | null;
  supplier?: { id: string; person?: { businessName?: string; firstName?: string; lastName?: string } };
  metadata?: { dteNumber?: string | null; [k: string]: unknown };
};

export type SupplierHonorariumReceiptListResult = {
  data: SupplierHonorariumReceiptListItem[];
  total: number;
  page: number;
  limit: number;
};
