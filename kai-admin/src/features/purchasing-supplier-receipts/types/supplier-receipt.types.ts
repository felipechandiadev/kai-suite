import type { ReceptionSupplierDocumentPaymentPayload } from "@/features/receptions/types/reception-document-payment.types";

export type SupplierReceiptLinkInfo = {
  purchaseOrderId?: string | null;
  receptionId?: string | null;
  stockInTransactionId?: string | null;
};

export type SupplierReceiptLine = {
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

export type CreateSupplierReceiptInput = {
  branchId: string;
  userId?: string;
  supplierId: string;
  storageId?: string | null;
  /** Folio DTE (tributario); mapea a `documentFolio` y `metadata.dteNumber` en el API. */
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
  links?: SupplierReceiptLinkInfo;
  lines: SupplierReceiptLine[];
  /** Plan de pago (modo + cuotas). Genera documentos SUPPLIER_PAYMENT en Cuentas por pagar. */
  supplierDocumentPayment?: ReceptionSupplierDocumentPaymentPayload;
};

export type SupplierReceiptListItem = {
  id: string;
  documentNumber?: string | null;
  transactionType: "SUPPLIER_RECEIPT";
  status: string;
  subtotal?: number;
  total: number;
  createdAt: string;
  documentFolio?: string | null;
  externalReference?: string | null;
  supplier?: { id: string; person?: { businessName?: string; firstName?: string; lastName?: string } };
  metadata?: { dteNumber?: string | null; [k: string]: unknown };
};

export type SupplierReceiptListResult = {
  data: SupplierReceiptListItem[];
  total: number;
  page: number;
  limit: number;
};
