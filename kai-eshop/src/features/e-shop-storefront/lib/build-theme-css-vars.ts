import type { CSSProperties } from "react";
import type { EShopResolvedTheme, EShopThemeTokens } from "../types/storefront.types";

const TOKEN_CSS_VAR: Record<keyof EShopThemeTokens, string> = {
  primary: "--fs-primary",
  secondary: "--fs-secondary",
  background: "--fs-background",
  surface: "--fs-surface",
  foreground: "--fs-foreground",
  border: "--fs-border",
  chrome: "--fs-chrome",
  chromeForeground: "--fs-chrome-foreground",
  active: "--fs-active",
  accent: "--fs-accent",
  muted: "--fs-muted",
  mutedForeground: "--fs-muted-foreground",
};

/** Mapea tokens de tema a variables CSS consumidas por globals.css / Tailwind. */
export function buildThemeCssVars(tokens: EShopThemeTokens): CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(TOKEN_CSS_VAR) as [keyof EShopThemeTokens, string][]) {
    const value = tokens[key];
    if (value) style[cssVar] = value;
  }
  style["--color-primary"] = tokens.primary;
  style["--color-background"] = tokens.background;
  style["--color-surface"] = tokens.surface;
  style["--color-foreground"] = tokens.foreground;
  style["--color-border"] = tokens.border;
  style["--color-active"] = tokens.active;
  style["--color-accent"] = tokens.accent;
  style["--color-secondary"] = tokens.secondary;
  style["--color-muted"] = tokens.muted;
  style["--color-muted-foreground"] = tokens.mutedForeground;
  style["--color-chrome"] = tokens.chrome;
  style["--color-chrome-foreground"] = tokens.chromeForeground;
  return style as CSSProperties;
}

export const CLASSIC_THEME_FALLBACK: EShopResolvedTheme = {
  templateId: "classic",
  tokens: {
    primary: "#002b59",
    secondary: "#04c9e6",
    background: "#ffffff",
    surface: "#ffffff",
    foreground: "#131615",
    border: "#c1c1c2",
    chrome: "#002b59",
    chromeForeground: "#ffffff",
    active: "#0a7cad",
    accent: "#0a7cad",
    muted: "#6b7280",
    mutedForeground: "#6b7280",
  },
};
