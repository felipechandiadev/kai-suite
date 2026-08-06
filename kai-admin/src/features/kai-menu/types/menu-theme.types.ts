export type MenuTemplateId = "classic" | "minimal" | "bold" | "warm" | "coastal";

export type MenuThemeTokenOverrides = Partial<
  Record<
    "primary" | "secondary" | "background" | "foreground" | "accent" | "border" | "chrome" | "card",
    string
  >
>;

export type MenuThemeTokens = Record<
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
  | "mutedForeground"
  | "card",
  string
>;

export type CompanyMenuThemeSettings = {
  templateId: MenuTemplateId;
  tokenOverrides: MenuThemeTokenOverrides;
};

export type MenuResolvedTheme = {
  templateId: MenuTemplateId;
  tokens: MenuThemeTokens;
};

export type MenuThemePreset = {
  id: MenuTemplateId;
  label: string;
  description: string;
  tokens: MenuThemeTokens;
};

export type MenuThemeAdminState = {
  theme: CompanyMenuThemeSettings;
  resolved: MenuResolvedTheme;
  presets: MenuThemePreset[];
};

export const MENU_THEME_OVERRIDE_LABELS: Record<keyof MenuThemeTokenOverrides, string> = {
  primary: "Primario",
  secondary: "Secundario",
  background: "Fondo",
  foreground: "Texto",
  accent: "Acento",
  border: "Borde",
  chrome: "Topbar",
  card: "Tarjeta",
};
