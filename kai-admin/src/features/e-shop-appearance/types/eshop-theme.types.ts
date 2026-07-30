export type EShopTemplateId = "classic" | "minimal" | "bold" | "warm" | "jewelry";

export type EShopThemeTokenOverrides = Partial<
  Record<
    "primary" | "secondary" | "background" | "foreground" | "accent" | "border" | "chrome",
    string
  >
>;

export type EShopThemeTokens = Record<
  | "primary"
  | "secondary"
  | "background"
  | "foreground"
  | "accent"
  | "border"
  | "chrome"
  | "chromeForeground"
  | "surface"
  | "active"
  | "muted"
  | "mutedForeground",
  string
>;

export type CompanyEShopThemeSettings = {
  templateId: EShopTemplateId;
  tokenOverrides: EShopThemeTokenOverrides;
};

export type EShopResolvedTheme = {
  templateId: EShopTemplateId;
  tokens: EShopThemeTokens;
};

export type EShopThemePreset = {
  id: EShopTemplateId;
  label: string;
  description: string;
  tokens: EShopThemeTokens;
};

export type EShopThemeAdminState = {
  theme: CompanyEShopThemeSettings;
  resolved: EShopResolvedTheme;
  presets: EShopThemePreset[];
};

export const THEME_OVERRIDE_LABELS: Record<keyof EShopThemeTokenOverrides, string> = {
  primary: "Primario",
  secondary: "Secundario",
  background: "Fondo",
  foreground: "Texto",
  accent: "Acento",
  border: "Borde",
  chrome: "Topbar y footer",
};
