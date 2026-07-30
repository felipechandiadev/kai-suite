export const SALE_DOCUMENT_KINDS = ['TICKET', 'BOLETA', 'FACTURA'] as const;

export type SaleDocumentKind = (typeof SALE_DOCUMENT_KINDS)[number];

export const DEFAULT_SALE_DOCUMENT_KIND: SaleDocumentKind = 'TICKET';

export const SALE_DOCUMENT_TO_DTE_TYPE: Record<SaleDocumentKind, number | null> = {
  TICKET: null,
  BOLETA: 39,
  FACTURA: 33,
};

export const DTE_TYPE_LABELS: Record<number, string> = {
  33: 'Factura electrónica',
  34: 'Factura exenta electrónica',
  39: 'Boleta electrónica',
  41: 'Boleta exenta electrónica',
  52: 'Guía de despacho electrónica',
  56: 'Nota de débito electrónica',
  61: 'Nota de crédito electrónica',
};

export function dteTypeLabel(dteType: number): string {
  return DTE_TYPE_LABELS[dteType] ?? `DTE ${dteType}`;
}

export function saleDocumentKindToDteType(kind: SaleDocumentKind): number | null {
  return SALE_DOCUMENT_TO_DTE_TYPE[kind];
}

export function normalizeSaleDocumentKind(raw: unknown): SaleDocumentKind {
  const normalized = String(raw ?? '')
    .trim()
    .toUpperCase();
  if ((SALE_DOCUMENT_KINDS as readonly string[]).includes(normalized)) {
    return normalized as SaleDocumentKind;
  }
  return DEFAULT_SALE_DOCUMENT_KIND;
}

export function isSaleDocumentKind(raw: unknown): raw is SaleDocumentKind {
  return (SALE_DOCUMENT_KINDS as readonly string[]).includes(
    String(raw ?? '').trim().toUpperCase(),
  );
}
