export type SupplierGuideLinkInfo = {
  purchaseOrderId?: string | null;
  receptionId?: string | null;
  stockInTransactionId?: string | null;
};

export type SupplierGuideLine = {
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

export type CreateSupplierGuideInput = {
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
  links?: SupplierGuideLinkInfo;
  lines: SupplierGuideLine[];
};

export type SupplierGuideListItem = {
  id: string;
  documentNumber?: string | null;
  transactionType: "SUPPLIER_GUIDE";
  status: string;
  total: number;
  createdAt: string;
  documentFolio?: string | null;
  externalReference?: string | null;
  supplier?: { id: string; person?: { businessName?: string; firstName?: string; lastName?: string } };
  metadata?: { dteNumber?: string | null; [k: string]: unknown };
};

export type SupplierGuideListResult = {
  data: SupplierGuideListItem[];
  total: number;
  page: number;
  limit: number;
};
