import Link from "next/link";
import type { EShopStorefront } from "@/features/e-shop-storefront/types/storefront.types";
import { isLightHexColor } from "@/features/e-shop-storefront/lib/is-light-hex-color";
import {
  resolveEShopNavHref,
  sortEnabledNavLinks,
} from "@/features/e-shop-storefront/lib/resolve-nav-href";
import { EShopCompanyLogo } from "@/shared/components/EShopCompanyLogo";
import { EShopPublicContactLinks } from "@/shared/components/EShopPublicContactLinks";
import { EShopSocialBrandLinks } from "@/shared/components/EShopSocialBrandLinks";
import type { CompanyEShopFooterSettings } from "@/features/e-shop-storefront/types/storefront.types";
import { DEFAULT_ESHOP_FOOTER } from "@/features/e-shop-storefront/lib/default-eshop-shell";

type Props = {
  storefront: EShopStorefront;
};

export function EShopFooter({ storefront }: Props) {
  const year = new Date().getFullYear();
  const contact = storefront.publicContact ?? {};
  const footer = storefront.footer ?? DEFAULT_ESHOP_FOOTER;
  const chrome = storefront.theme?.tokens.chrome ?? "#002b59";
  const chromeIsLight = isLightHexColor(chrome);

  const brandColumn =
    footer.showLogo || footer.showTagline || footer.showBrandManifest;
  const contactColumn = footer.showContactBlock || footer.showSocialLinks;
  const linkGroups = [...footer.linkGroups]
    .filter((g) => g.enabled)
    .sort((a, b) => a.order - b.order);

  const columnCount = Math.min(
    4,
    (brandColumn ? 1 : 0) + linkGroups.length + (contactColumn ? 1 : 0),
  );
  const gridClass =
    columnCount <= 1
      ? "md:grid-cols-1"
      : columnCount === 2
        ? "md:grid-cols-2"
        : columnCount === 3
          ? "md:grid-cols-3"
          : "md:grid-cols-4";

  const copyright = footer.copyrightSuffix?.trim()
    ? `© ${year} ${storefront.companyName} — ${footer.copyrightSuffix}`
    : `© ${year} ${storefront.companyName}`;

  return (
    <footer className="mt-16 bg-chrome text-chrome-foreground">
      <div className={`mx-auto grid max-w-6xl gap-8 px-4 py-10 ${gridClass}`}>
        {brandColumn ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {footer.showLogo ? (
                <EShopCompanyLogo
                  companyName={storefront.companyName}
                  logoUrl={storefront.companyLogoUrl}
                  size="md"
                  onPrimary={!chromeIsLight}
                  className="shrink-0"
                />
              ) : null}
              <div className="min-w-0">
                <p className="font-semibold">{storefront.companyName}</p>
                {footer.showTagline && storefront.tagline ? (
                  <p className="mt-1 text-sm text-chrome-foreground/85">{storefront.tagline}</p>
                ) : null}
              </div>
            </div>
            {footer.showBrandManifest && storefront.brandManifest ? (
              <p className="text-sm leading-relaxed text-chrome-foreground/85 whitespace-pre-line">
                {storefront.brandManifest}
              </p>
            ) : null}
          </div>
        ) : null}

        {linkGroups.map((group) => {
          const links = sortEnabledNavLinks(group.links);
          if (links.length === 0) return null;
          return (
            <div key={group.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-chrome-foreground/75">
                {group.title}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {links.map((item) => (
                  <li key={item.id}>
                    {item.kind === "external" ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-chrome-foreground hover:text-chrome-foreground/80"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={resolveEShopNavHref(item, "/")}
                        className="text-chrome-foreground hover:text-chrome-foreground/80"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {contactColumn ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-chrome-foreground/75">
              Contacto
            </p>
            {footer.showContactBlock ? (
              <EShopPublicContactLinks
                contact={contact}
                omit={["instagram", "tiktok", "facebook"]}
                className="mt-3 space-y-1 text-sm text-chrome-foreground/85"
                linkClassName="text-chrome-foreground/85 hover:text-chrome-foreground"
              />
            ) : null}
            {footer.showSocialLinks ? (
              <EShopSocialBrandLinks
                contact={contact}
                className="mt-4 flex flex-wrap items-center gap-3"
              />
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="border-t border-chrome-foreground/20 py-4 text-center text-xs text-chrome-foreground/75">
        {copyright}
        {" · "}
        <Link href="/acerca" className="underline hover:text-chrome-foreground">
          Acerca de Kai
        </Link>
      </p>
    </footer>
  );
}
