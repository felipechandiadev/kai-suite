export type PurchaseOrderGridRow = {
  id: string;
  documentNumber: string;
  documentFolio: string | null;
  status: string;
  supplierName: string;
  supplierDocumentNumber: string | null;
  branchName: string;
  documentDate: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAtIso: string | null;
  /** Unidades pedidas/recibidas (suma de líneas); null si aún no se recibió nada. */
  receptionSummary: { ordered: number; received: number } | null;
};
