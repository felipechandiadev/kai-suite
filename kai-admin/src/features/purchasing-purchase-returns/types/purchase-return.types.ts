export type PurchaseReturnMetadataLinks = {
  receptionId?: string | null;
  purchaseOrderId?: string | null;
  supplierInvoiceId?: string | null;
};

/** Listado desde `GET /api/purchase-returns` (misma forma que transacciones). */
export type PurchaseReturnListItem = {
  id: string;
  createdAt: string;
  documentNumber?: string | null;
  status?: string;
  subtotal?: number | string | null;
  taxAmount?: number | string | null;
  total?: number | string | null;
  supplier?: {
    id: string;
    person?: { businessName?: string; firstName?: string; lastName?: string };
  };
  externalReference?: string | null;
  notes?: string | null;
  metadata?: { links?: PurchaseReturnMetadataLinks } | null;
};

export function extractReceptionIdFromPurchaseReturn(
  item: Pick<PurchaseReturnListItem, "metadata">,
): string | null {
  const id = item.metadata?.links?.receptionId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export type PurchaseReturnListResult = {
  data: PurchaseReturnListItem[];
  total: number;
  page: number;
  limit: number;
};

export type CreatePurchaseReturnResult =
  | { success: true; id?: string; data?: unknown }
  | { success: false; error: string };

export type CreatePurchaseReturnInput = {
  branchId: string;
  /** Lo rellena la server action desde la sesión si se omite. */
  userId?: string;
  supplierId: string;
  storageId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  externalReference?: string | null;
  notes?: string | null;
  lines: Array<{
    quantity: number;
    unitPrice: number;
    productName: string;
    productId?: string;
    productVariantId?: string;
    sku?: string;
    subtotal?: number;
    total?: number;
    taxAmount?: number;
    taxRate?: number;
    taxId?: string;
  }>;
  metadata?: { links?: Record<string, string | null> };
};
