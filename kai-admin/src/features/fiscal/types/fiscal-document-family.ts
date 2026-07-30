export type FiscalDocumentFamilyKey =
  | "boleta"
  | "factura"
  | "notaCredito"
  | "guiaDespacho";

export type FiscalDocumentFamilyTab =
  | "boleta"
  | "factura"
  | "nota-credito"
  | "guia";

export type FiscalDocumentFamilies = Record<FiscalDocumentFamilyKey, boolean>;

export const DEFAULT_FISCAL_DOCUMENT_FAMILIES: FiscalDocumentFamilies = {
  boleta: true,
  factura: false,
  notaCredito: false,
  guiaDespacho: false,
};

export const FISCAL_DOCUMENT_FAMILY_META: {
  key: FiscalDocumentFamilyKey;
  tab: FiscalDocumentFamilyTab;
  label: string;
  dteType: number;
  pipeline: "REST" | "SOAP";
  description: string;
}[] = [
  {
    key: "boleta",
    tab: "boleta",
    label: "Boleta electrónica",
    dteType: 39,
    pipeline: "REST",
    description: "Boleta afecta (tipo 39). Emisión vía API REST del SII.",
  },
  {
    key: "factura",
    tab: "factura",
    label: "Factura electrónica",
    dteType: 33,
    pipeline: "SOAP",
    description: "Factura afecta (tipo 33). Emisión vía Web Services SOAP.",
  },
  {
    key: "notaCredito",
    tab: "nota-credito",
    label: "Nota de crédito",
    dteType: 61,
    pipeline: "SOAP",
    description: "Nota de crédito electrónica (tipo 61).",
  },
  {
    key: "guiaDespacho",
    tab: "guia",
    label: "Guía de despacho",
    dteType: 52,
    pipeline: "SOAP",
    description: "Guía de despacho electrónica (tipo 52).",
  },
];

export function normalizeFiscalDocumentFamilies(
  raw?: Partial<FiscalDocumentFamilies> | null,
): FiscalDocumentFamilies {
  return {
    ...DEFAULT_FISCAL_DOCUMENT_FAMILIES,
    ...(raw ?? {}),
  };
}

export function enabledFamilyTabs(
  families: FiscalDocumentFamilies,
): FiscalDocumentFamilyTab[] {
  return FISCAL_DOCUMENT_FAMILY_META.filter((m) => families[m.key]).map((m) => m.tab);
}

export function tabToFamilyKey(tab: string): FiscalDocumentFamilyKey | null {
  const found = FISCAL_DOCUMENT_FAMILY_META.find((m) => m.tab === tab);
  return found?.key ?? null;
}

export function tabToDteType(tab: string): number | null {
  const found = FISCAL_DOCUMENT_FAMILY_META.find((m) => m.tab === tab);
  return found?.dteType ?? null;
}

export function resolveActiveFamilyTab(
  tabParam: string | null | undefined,
  families: FiscalDocumentFamilies,
): FiscalDocumentFamilyTab {
  const enabled = enabledFamilyTabs(families);
  if (enabled.length === 0) return "boleta";
  if (tabParam && enabled.includes(tabParam as FiscalDocumentFamilyTab)) {
    return tabParam as FiscalDocumentFamilyTab;
  }
  return enabled[0]!;
}
