export type CompanySettingsTabId =
  | "general"
  | "identidad"
  | "bancos"
  | "medios-pago"
  | "credito-interno"
  | "cheques"
  | "cotizaciones"
  | "preventa"
  | "contacto"
  | "eshop"
  | "socios";

export type CompanySettingsTabItem = {
  id: CompanySettingsTabId;
  label: string;
};

export const COMPANY_SETTINGS_TABS: CompanySettingsTabItem[] = [
  { id: "general", label: "General" },
  { id: "identidad", label: "Identidad" },
  { id: "bancos", label: "Bancos" },
  { id: "medios-pago", label: "Medios de pago" },
  { id: "credito-interno", label: "Crédito interno" },
  { id: "cheques", label: "Cheques" },
  { id: "cotizaciones", label: "Cotizaciones" },
  { id: "preventa", label: "Preventa" },
  { id: "contacto", label: "Contacto" },
  { id: "eshop", label: "eShop" },
  { id: "socios", label: "Socios" },
];

const LEGACY_TAB_HASH_ALIASES: Record<string, CompanySettingsTabId> = {
  logo: "identidad",
  tagline: "identidad",
};

export function companySettingsTabFromHash(hash: string): CompanySettingsTabId | null {
  const id = hash.replace(/^#/, "").trim();
  if (!id) return null;
  const resolved = LEGACY_TAB_HASH_ALIASES[id] ?? id;
  return COMPANY_SETTINGS_TABS.some((t) => t.id === resolved)
    ? (resolved as CompanySettingsTabId)
    : null;
}
