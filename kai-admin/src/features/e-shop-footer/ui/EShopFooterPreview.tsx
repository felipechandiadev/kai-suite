import type { EShopResolvedTheme } from "@/features/e-shop-appearance/types/eshop-theme.types";
import { buildThemePreviewStyle } from "@/features/e-shop-appearance/lib/build-theme-preview-style";
import type { CompanyEShopFooterSettings } from "../types/eshop-footer.types";

type Props = {
  footer: CompanyEShopFooterSettings;
  companyName?: string;
  theme?: EShopResolvedTheme | null;
};

export function EShopFooterPreview({
  footer,
  companyName = "Mi tienda",
  theme,
}: Props) {
  const groups = [...footer.linkGroups]
    .filter((g) => g.enabled)
    .sort((a, b) => a.order - b.order);

  const brandColumn =
    footer.showLogo || footer.showTagline || footer.showBrandManifest;
  const contactColumn = footer.showContactBlock || footer.showSocialLinks;

  const columnCount = Math.min(
    4,
    (brandColumn ? 1 : 0) + groups.length + (contactColumn ? 1 : 0),
  );
  const gridClass =
    columnCount <= 1
      ? "md:grid-cols-1"
      : columnCount === 2
        ? "md:grid-cols-2"
        : columnCount === 3
          ? "md:grid-cols-3"
          : "md:grid-cols-4";

  const themeStyle = theme?.tokens ? buildThemePreviewStyle(theme.tokens) : undefined;
  const chrome = theme?.tokens.chrome ?? "#002b59";
  const chromeFg = theme?.tokens.chromeForeground ?? "#ffffff";

  return (
    <div className="w-full min-w-0" data-test-id="eshop-footer-preview">
      <div
        className="w-full overflow-hidden border border-border shadow-sm"
        style={{
          ...themeStyle,
          backgroundColor: chrome,
          color: chromeFg,
        }}
      >
        <div className={`grid gap-6 px-4 py-8 ${gridClass}`}>
          {brandColumn ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {footer.showLogo ? (
                  <span
                    className="h-10 w-10 shrink-0 rounded bg-white/20"
                    aria-hidden
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="font-semibold">{companyName}</p>
                  {footer.showTagline ? (
                    <p className="mt-1 text-sm opacity-85">Tagline de ejemplo</p>
                  ) : null}
                </div>
              </div>
              {footer.showBrandManifest ? (
                <p className="text-sm leading-relaxed opacity-85">
                  Manifiesto de marca de ejemplo.
                </p>
              ) : null}
            </div>
          ) : null}

          {groups.map((g) => (
            <div key={g.id}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
                {g.title}
              </p>
              <ul className="mt-3 space-y-2 text-sm opacity-90">
                {g.links
                  .filter((l) => l.enabled)
                  .map((l) => (
                    <li key={l.id}>{l.label}</li>
                  ))}
              </ul>
            </div>
          ))}

          {contactColumn ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
                Contacto
              </p>
              {footer.showContactBlock ? (
                <p className="mt-3 text-sm opacity-85">contacto@empresa.cl</p>
              ) : null}
              {footer.showSocialLinks ? (
                <p className="mt-3 text-sm opacity-85">Instagram · TikTok</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <p
          className="border-t py-4 text-center text-xs opacity-75"
          style={{ borderColor: `${chromeFg}33` }}
        >
          © {new Date().getFullYear()} {companyName}
          {footer.copyrightSuffix ? ` — ${footer.copyrightSuffix}` : ""}
        </p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Vista previa a ancho de tienda. Tagline, manifiesto y contacto provienen de Configuración →
        Empresa.
      </p>
    </div>
  );
}
