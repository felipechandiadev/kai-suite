import type { CreateDirectReceptionInput } from "../types/reception.types";

export type BulkReceptionRowError = {
  rowNumber: number;
  message: string;
};

export type BulkReceptionResolvedLine = {
  rowNumber: number;
  productId: string;
  productVariantId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export type BulkReceptionPreparedGroup = {
  key: string;
  supplierId: string;
  supplierName: string;
  supplierRut: string;
  numeroFactura: string;
  lines: BulkReceptionResolvedLine[];
  /** Payload listo para `createDirectReceptionAction` (sin userId). */
  createInput: CreateDirectReceptionInput;
  /** true si ya existe recepción para este proveedor + factura. */
  duplicate: boolean;
  duplicateMessage?: string;
};

export type BulkReceptionPrepareResult =
  | {
      success: true;
      groups: BulkReceptionPreparedGroup[];
      rowErrors: BulkReceptionRowError[];
      /** true si hay errores de fila o todos los grupos son duplicados. */
      blocked: boolean;
    }
  | { success: false; error: string };

export function bulkGroupKey(supplierId: string, numeroFactura: string): string {
  return `${supplierId.trim()}::${numeroFactura.trim().toLowerCase()}`;
}

export function buildSupplierFiscalAmounts(params: {
  subtotalNeto: number;
  taxId: string | null;
  taxRatePct: number;
}) {
  const subtotalNeto = Math.max(0, Math.round(params.subtotalNeto));
  const rate = Math.max(0, Number(params.taxRatePct) || 0);
  const taxAmount = Math.round((subtotalNeto * rate) / 100);
  return {
    subtotalNeto,
    taxAmount,
    total: subtotalNeto + taxAmount,
    taxId: params.taxId,
    taxRatePct: rate,
  };
}
