import type { ReactNode } from "react";
import type { EShopResolvedTheme } from "../types/storefront.types";
import { buildThemeCssVars, CLASSIC_THEME_FALLBACK } from "../lib/build-theme-css-vars";

type Props = {
  theme?: EShopResolvedTheme | null;
  children: ReactNode;
};

export function EShopThemeShell({ theme, children }: Props) {
  const resolved = theme?.tokens ? theme : CLASSIC_THEME_FALLBACK;
  const templateId = theme?.templateId ?? CLASSIC_THEME_FALLBACK.templateId;

  return (
    <div
      className="eshop-theme-shell flex min-h-full flex-1 flex-col"
      data-eshop-template={templateId}
      style={buildThemeCssVars(resolved.tokens)}
    >
      {children}
    </div>
  );
}
