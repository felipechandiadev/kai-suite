import type { ReceptionSupplierDocumentPaymentPayload } from "@/features/receptions/types/reception-document-payment.types";

export type SupplierInvoiceLinkInfo = {
  purchaseOrderId?: string | null;
  receptionId?: string | null;
  stockInTransactionId?: string | null;
};

/** Plan de pagos guardado en `metadata.plannedPayments` de la transacción factura. */
export type CreateSupplierInvoicePlannedPayment = {
  /** Fecha de pago (YYYY-MM-DD). */
  dueDate: string;
  amount: number;
  /** Medio de pago; omitir en cuotas programadas (se define al ejecutar el pago). */
  paymentMethod?: "CASH" | "TRANSFER" | "CHECK";
  companyBankAccountKey?: string | null;
  supplierBankAccountKey?: string | null;
  chequeNumber?: string | null;
  chequeBankName?: string | null;
  chequeDrawerName?: string | null;
  chequeDueDate?: string | null;
};

export type SupplierInvoiceLine = {
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

export type CreateSupplierInvoiceInput = {
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
  links?: SupplierInvoiceLinkInfo;
  lines: SupplierInvoiceLine[];
  /** Se persiste en `metadata.plannedPayments` en el API. */
  plannedPayments?: CreateSupplierInvoicePlannedPayment[];
  /** Plan de pago (modo + cuotas). Genera documentos SUPPLIER_PAYMENT en Cuentas por pagar. */
  supplierDocumentPayment?: ReceptionSupplierDocumentPaymentPayload;
};

export type SupplierInvoiceListItem = {
  id: string;
  documentNumber?: string | null;
  transactionType: "SUPPLIER_INVOICE";
  status: string;
  paymentStatus?: string | null;
  amountPaid?: number;
  subtotal?: number;
  total: number;
  createdAt: string;
  documentFolio?: string | null;
  externalReference?: string | null;
  supplier?: {
    id: string;
    person?: {
      businessName?: string;
      firstName?: string;
      lastName?: string;
      documentType?: string | null;
      documentNumber?: string | null;
    };
  };
  metadata?: { dteNumber?: string | null; [k: string]: unknown };
};

export type SupplierInvoiceListResult = {
  data: SupplierInvoiceListItem[];
  total: number;
  page: number;
  limit: number;
};

