"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { MenuResolvedTheme, MenuThemeTokens } from "../infrastructure/menu.request";

const CLASSIC_FALLBACK: MenuResolvedTheme = {
  templateId: "classic",
  tokens: {
    primary: "#c2410c",
    secondary: "#ea580c",
    background: "#faf7f2",
    surface: "#faf7f2",
    card: "#ffffff",
    foreground: "#1c1917",
    border: "#e7e5e4",
    chrome: "#ffffff",
    chromeForeground: "#1c1917",
    active: "#c2410c",
    accent: "#c2410c",
    muted: "#78716c",
    mutedForeground: "#78716c",
  },
};

const ROOT_VAR_KEYS = [
  "--background",
  "--foreground",
  "--primary",
  "--muted",
  "--card",
  "--border",
  "--secondary",
  "--accent",
  "--chrome",
  "--chrome-foreground",
  "--color-background",
  "--color-foreground",
  "--color-primary",
  "--color-muted",
  "--color-card",
  "--color-border",
  "--color-secondary",
  "--color-accent",
] as const;

function buildMenuThemeCssVars(tokens: MenuThemeTokens): Record<string, string> {
  return {
    "--background": tokens.background,
    "--foreground": tokens.foreground,
    "--primary": tokens.primary,
    "--muted": tokens.muted,
    "--card": tokens.card || tokens.surface || "#ffffff",
    "--border": tokens.border,
    "--secondary": tokens.secondary,
    "--accent": tokens.accent,
    "--chrome": tokens.chrome,
    "--chrome-foreground": tokens.chromeForeground,
    // Aliases Tailwind (`bg-background`, `text-foreground`, …)
    "--color-background": tokens.background,
    "--color-foreground": tokens.foreground,
    "--color-primary": tokens.primary,
    "--color-muted": tokens.muted,
    "--color-card": tokens.card || tokens.surface || "#ffffff",
    "--color-border": tokens.border,
    "--color-secondary": tokens.secondary,
    "--color-accent": tokens.accent,
  };
}

type Props = {
  theme?: MenuResolvedTheme | null;
  children: ReactNode;
};

/** Aplica tokens en :root para que body y utilidades Tailwind vean el tema de la carta. */
export function MenuThemeShell({ theme, children }: Props) {
  const resolved = theme?.tokens ? theme : CLASSIC_FALLBACK;
  const cssVars = buildMenuThemeCssVars(resolved.tokens);
  const tokensKey = [
    resolved.templateId,
    resolved.tokens.primary,
    resolved.tokens.background,
    resolved.tokens.foreground,
    resolved.tokens.card,
    resolved.tokens.border,
    resolved.tokens.chrome,
    resolved.tokens.muted,
    resolved.tokens.secondary,
    resolved.tokens.accent,
  ].join("|");

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value);
    }
    root.dataset.menuTemplate = resolved.templateId;
    return () => {
      for (const key of ROOT_VAR_KEYS) {
        root.style.removeProperty(key);
      }
      delete root.dataset.menuTemplate;
    };
    // tokensKey refleja cambios de tema; cssVars se regenera en el mismo render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokensKey]);

  return (
    <div
      className="menu-theme-shell min-h-screen bg-[var(--background)] text-[var(--foreground)]"
      data-menu-template={resolved.templateId}
      style={cssVars as CSSProperties}
    >
      {children}
    </div>
  );
}
