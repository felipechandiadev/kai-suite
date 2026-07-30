import type { ReceptionSupplierDocumentPaymentPayload } from "./reception-document-payment.types";

export type ReceptionDteType = "invoice" | "receipt" | "guide" | "other";

/** Totales del documento fiscal (factura/boleta) alineados con el builder (neto + IVA). */
export type SupplierFiscalAmountsPayload = {
  subtotalNeto: number;
  taxAmount: number;
  total: number;
  taxId: string | null;
  taxRatePct: number;
};

export type CreateDirectReceptionLineInput = {
  productId: string;
  productVariantId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  /** Costo unitario para inventario / PMP (si no se envía, el backend usa unitPrice). */
  unitCost?: number;
  subtotal?: number;
  receivedQuantity?: number;
};

export type CreateDirectReceptionInput = {
  branchId: string;
  storageId?: string | null;
  supplierId?: string | null;
  /** Transacción `PURCHASE_ORDER` asociada a esta recepción. */
  purchaseOrderId?: string | null;
  /** Referencia o folio del documento del proveedor (factura, guía, etc.). */
  reference?: string | null;
  documentType: ReceptionDteType;
  notes?: string | null;
  lines: CreateDirectReceptionLineInput[];
  /** Plan de pago del documento fiscal (factura/boleta); el backend crea la transacción fiscal al guardar. */
  supplierDocumentPayment?: ReceptionSupplierDocumentPaymentPayload | null;
  /** Montos y tasa para `SUPPLIER_INVOICE` / `SUPPLIER_RECEIPT` (obligatorio si documentType es factura o boleta). */
  supplierFiscalAmounts?: SupplierFiscalAmountsPayload | null;
};

export type CreateReceptionResult =
  | {
      success: true;
      receptionId?: string;
      internalDocumentNumber?: string | null;
      supplierDocumentError?: string | null;
      /** Error al crear la transacción PURCHASE (stock / PMP no se actualizaron). */
      transactionError?: string | null;
      /** Pagos SUPPLIER_PAYMENT en efectivo desde sesión de caja (para ticket POS). */
      sessionCashSupplierPayments?: Array<{
        documentNumber: string;
        amount: number;
        paymentMethod: string;
        cashSessionId: string;
        notes: string | null;
      }>;
    }
  | { success: false; error: string };

/** Fila enriquecida desde `GET /api/receptions` (`rows[]` del backend). */
export type ReceptionGridRow = {
  id: string;
  createdAt?: string;
  supplierName?: string | null;
  /** DNI / documento de identidad del proveedor (`person.documentNumber`). */
  supplierDni?: string | null;
  storageName?: string | null;
  /** Folio interno de la recepción (transacción PURCHASE, p. ej. CMP-26-00001). */
  folio?: string | null;
  documentNumber?: string | null;
  dteType?: string | null;
  reference?: string | null;
  /** Referencia del documento del proveedor (DTE / factura). */
  supplierDocumentRef?: string | null;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  /** Origen: directa, desde OC, etc. */
  type?: string;
  /** Folio de la orden de compra cuando `type === "from-purchase-order"`. */
  purchaseOrderNumber?: string | null;
};

export type ReceptionListForGridResult = {
  rows: ReceptionGridRow[];
  total: number;
  limit: number;
  offset: number;
};

/** Recepción con líneas (p. ej. `GET /api/receptions/:id` o `.../resolve`). */
export type ReceptionLineForReturn = {
  id: string;
  productId?: string | null;
  productVariantId?: string | null;
  productName: string;
  sku?: string | null;
  variantName?: string | null;
  quantity: number;
  receivedQuantity?: number | null;
  unitPrice: number;
};

export type ReceptionDetailForReturn = {
  id: string;
  supplierId?: string | null;
  storageId?: string | null;
  createdAt?: string;
  folio?: string | null;
  documentNumber?: string | null;
  supplierDocumentRef?: string | null;
  supplierName?: string | null;
  storageName?: string | null;
  reference?: string | null;
  dteNumber?: string | null;
  dteType?: string | null;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  notes?: string | null;
  type?: string | null;
  lines: ReceptionLineForReturn[];
};

export type ReceptionFetchResult =
  | { success: true; reception: ReceptionDetailForReturn }
  | { success: false; error: string };
