export type SaleDocumentKind = "TICKET" | "BOLETA" | "FACTURA";

export type PosFiscalPolicy = {
  allowedDocumentKinds: SaleDocumentKind[];
  defaultDocumentKind: SaleDocumentKind;
};

export type PosFolioAllocation = {
  id: string;
  pointOfSaleId: string;
  cafId?: string;
  subPackCode?: string;
  label?: string | null;
  packageCode?: string | null;
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
  environment: string;
  isActive: boolean;
  availableFolios: number;
  isCurrent?: boolean;
  isExhausted?: boolean;
};

export type UpsertPosFolioAllocationInput = {
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolio?: number;
  isActive?: boolean;
};

export type FiscalFolioSummary = {
  dteType: number;
  caf: {
    id: string;
    packageCode?: string;
    rangeFrom: number;
    rangeTo: number;
    nextFolio: number;
    available: number;
  } | null;
  assignedToPos: number;
  unassigned: number;
  allocations: Array<{
    id: string;
    subPackCode?: string;
    cafId?: string;
    pointOfSaleId: string;
    rangeFrom: number;
    rangeTo: number;
    nextFolio: number;
    availableFolios: number;
  }>;
};

export const SALE_DOCUMENT_KIND_LABELS: Record<SaleDocumentKind, string> = {
  TICKET: "Ticket",
  BOLETA: "Boleta electrónica (39)",
  FACTURA: "Factura electrónica (33)",
};

export const DTE_TYPE_LABELS: Record<number, string> = {
  33: "Factura electrónica",
  39: "Boleta electrónica",
  41: "Boleta exenta electrónica",
  61: "Nota de crédito electrónica",
};

export function dteTypeLabel(dteType: number): string {
  return DTE_TYPE_LABELS[dteType] ?? `DTE ${dteType}`;
}
