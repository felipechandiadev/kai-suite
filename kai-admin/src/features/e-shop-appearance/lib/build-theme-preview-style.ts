import type { CSSProperties } from "react";
import type { EShopThemeTokens } from "../types/eshop-theme.types";

export function buildThemePreviewStyle(tokens: EShopThemeTokens): CSSProperties {
  return {
    "--fs-primary": tokens.primary,
    "--fs-secondary": tokens.secondary,
    "--fs-background": tokens.background,
    "--fs-foreground": tokens.foreground,
    "--fs-border": tokens.border,
    "--fs-accent": tokens.accent,
    "--fs-active": tokens.active,
    "--fs-chrome": tokens.chrome,
    "--fs-chrome-foreground": tokens.chromeForeground,
    "--color-primary": tokens.primary,
    "--color-secondary": tokens.secondary,
    "--color-background": tokens.background,
    "--color-foreground": tokens.foreground,
    "--color-chrome": tokens.chrome,
    "--color-chrome-foreground": tokens.chromeForeground,
  } as CSSProperties;
}
