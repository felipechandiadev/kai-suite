import type { CompanyEShopTopBarSettings } from "../types/eshop-topbar.types";
import type { EShopResolvedTheme } from "@/features/e-shop-appearance/types/eshop-theme.types";
import { buildThemePreviewStyle } from "@/features/e-shop-appearance/lib/build-theme-preview-style";
import { ShoppingCart } from "lucide-react";

type Props = {
  topBar: CompanyEShopTopBarSettings;
  companyName?: string;
  theme?: EShopResolvedTheme | null;
};

export function EShopTopBarPreview({ topBar, companyName = "Mi tienda", theme }: Props) {
  const links = [...topBar.navLinks]
    .filter((l) => l.enabled)
    .sort((a, b) => a.order - b.order);

  const themeStyle = theme?.tokens ? buildThemePreviewStyle(theme.tokens) : undefined;
  const chromeFg = theme?.tokens.chromeForeground ?? "#ffffff";

  return (
    <div className="w-full min-w-0" data-test-id="eshop-topbar-preview">
      <div
        className="flex h-14 w-full items-center justify-between gap-4 border border-border px-4 shadow-sm"
        style={{
          ...themeStyle,
          backgroundColor: theme?.tokens.chrome ?? "var(--fs-chrome, #002b59)",
          color: chromeFg,
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {topBar.showLogo ? (
            <span
              className="h-8 w-8 shrink-0 rounded bg-white/20"
              aria-hidden
            />
          ) : null}
          {topBar.showCompanyName ? (
            <span className="truncate text-sm font-semibold">{companyName}</span>
          ) : null}
        </div>
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-6 md:flex">
          {links.map((l) => (
            <span key={l.id} className="truncate text-sm opacity-80">
              {l.label}
            </span>
          ))}
        </div>
        {topBar.showCart ? (
          <div className="relative shrink-0">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded"
              style={{
                backgroundColor: theme?.tokens.secondary ?? "#04c9e6",
                color: theme?.tokens.primary ?? "#002b59",
              }}
              aria-hidden
            >
              <ShoppingCart size={18} strokeWidth={1.75} />
            </span>
            <span
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold"
              style={{
                backgroundColor: theme?.tokens.secondary ?? "#04c9e6",
                color: theme?.tokens.primary ?? "#002b59",
                borderColor: theme?.tokens.chrome ?? "#002b59",
              }}
            >
              2
            </span>
          </div>
        ) : (
          <span className="w-9 shrink-0 md:hidden" aria-hidden />
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Vista previa a ancho de tienda. En móvil, los enlaces aparecen en el menú ☰.
      </p>
    </div>
  );
}
