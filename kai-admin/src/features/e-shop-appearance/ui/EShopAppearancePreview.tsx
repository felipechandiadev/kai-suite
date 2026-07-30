import type { EShopResolvedTheme } from "../types/eshop-theme.types";
import { buildThemePreviewStyle } from "../lib/build-theme-preview-style";

type Props = {
  resolved: EShopResolvedTheme;
};

export function EShopAppearancePreview({ resolved }: Props) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border shadow-sm"
      data-test-id="eshop-appearance-preview"
      style={buildThemePreviewStyle(resolved.tokens)}
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-sm"
        style={{ backgroundColor: "var(--fs-chrome)", color: "var(--fs-chrome-foreground)" }}
      >
        <span className="font-semibold">Mi tienda</span>
        <span className="rounded-md px-2 py-1 text-xs" style={{ backgroundColor: "var(--fs-secondary)", color: "var(--fs-primary)" }}>
          Carrito
        </span>
      </div>
      <div className="space-y-3 p-4" style={{ backgroundColor: "var(--fs-background)", color: "var(--fs-foreground)" }}>
        <p className="text-lg font-semibold">Producto ejemplo</p>
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: "var(--fs-border)", backgroundColor: "var(--fs-background)" }}
        >
          <p className="text-sm font-medium">Camiseta básica</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "var(--fs-accent)" }}>
            $19.990
          </p>
        </div>
        <button
          type="button"
          className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--fs-secondary)", color: "var(--fs-primary)" }}
        >
          Comprar ahora
        </button>
      </div>
      <div
        className="px-4 py-3 text-center text-xs"
        style={{ backgroundColor: "var(--fs-chrome)", color: "var(--fs-chrome-foreground)" }}
      >
        Footer
      </div>
    </div>
  );
}
