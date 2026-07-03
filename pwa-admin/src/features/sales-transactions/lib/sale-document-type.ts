import type { BadgeVariant } from "@/shared/components/Badge/Badge";

export type SaleDocumentType = "TICKET" | "BOLETA" | "FACTURA" | (string & {});

const FISCAL_SALE_DOCUMENT_TYPES = new Set<string>(["BOLETA", "FACTURA"]);

export const SALE_DOCUMENT_TYPE_LABEL: Record<string, string> = {
  TICKET: "Ticket",
  BOLETA: "Boleta",
  FACTURA: "Factura",
};

export function normalizeSaleDocumentType(
  raw: string | null | undefined,
): SaleDocumentType {
  const normalized = raw?.trim().toUpperCase();
  if (!normalized) return "TICKET";
  return normalized;
}

export function saleDocumentTypeLabel(
  raw: string | null | undefined,
): string {
  const type = normalizeSaleDocumentType(raw);
  return SALE_DOCUMENT_TYPE_LABEL[type] ?? type;
}

export function isFiscalSaleDocumentType(
  raw: string | null | undefined,
): boolean {
  const type = normalizeSaleDocumentType(raw);
  return FISCAL_SALE_DOCUMENT_TYPES.has(type);
}

export function formatSaleDocumentFolio(
  documentType: string | null | undefined,
  documentFolio: string | null | undefined,
): string {
  if (!isFiscalSaleDocumentType(documentType)) return "—";
  const folio = documentFolio?.trim();
  return folio || "—";
}

export function saleDocumentTypeBadgeVariant(
  raw: string | null | undefined,
): BadgeVariant {
  const type = normalizeSaleDocumentType(raw);
  if (type === "BOLETA" || type === "FACTURA") return "success-outlined";
  if (type === "TICKET") return "secondary-outlined";
  return "secondary-outlined";
}
