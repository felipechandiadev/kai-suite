export type CreatePurchaseOrderLineInput = {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxIds: string[];
  /** Solo UI / impresión; no se envía al API de creación de OC. */
  attributeValues?: Record<string, string>;
};

export type CreatePurchaseOrderInput = {
  branchId: string;
  /** Obligatorio si `saveAsDraft` no es verdadero. */
  supplierId?: string;
  /** Si se omite, la transacción queda sin almacén hasta recepción/conversión a compra. */
  storageId?: string;
  documentDate: string;
  documentFolio?: string;
  /** Notas de la transacción (columna `notes` en la OC). */
  notes?: string | null;
  lines: CreatePurchaseOrderLineInput[];
  /** Si es true, estado DRAFT y se permiten borrador sin proveedor ni líneas. */
  saveAsDraft?: boolean;
};

export type CreatePurchaseOrderResult =
  | { success: true; id: string; documentNumber?: string }
  | { success: false; error: string };
