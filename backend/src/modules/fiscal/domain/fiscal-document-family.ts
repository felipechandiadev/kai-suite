export type FiscalDocumentFamilyKey =
  | 'boleta'
  | 'factura'
  | 'notaCredito'
  | 'guiaDespacho';

export type FiscalDocumentFamilies = Record<FiscalDocumentFamilyKey, boolean>;

export const DEFAULT_FISCAL_DOCUMENT_FAMILIES: FiscalDocumentFamilies = {
  boleta: true,
  factura: false,
  notaCredito: false,
  guiaDespacho: false,
};

export const FISCAL_DOCUMENT_FAMILY_DTE_TYPE: Record<FiscalDocumentFamilyKey, number> = {
  boleta: 39,
  factura: 33,
  notaCredito: 61,
  guiaDespacho: 52,
};

export const FISCAL_DOCUMENT_FAMILY_PIPELINE: Record<
  FiscalDocumentFamilyKey,
  'REST' | 'SOAP'
> = {
  boleta: 'REST',
  factura: 'SOAP',
  notaCredito: 'SOAP',
  guiaDespacho: 'SOAP',
};

export function normalizeFiscalDocumentFamilies(
  raw: unknown,
): FiscalDocumentFamilies {
  const base = { ...DEFAULT_FISCAL_DOCUMENT_FAMILIES };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as FiscalDocumentFamilyKey[]) {
    if (typeof obj[key] === 'boolean') {
      base[key] = obj[key] as boolean;
    }
  }
  return base;
}
