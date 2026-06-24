"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconButton } from "@/shared/admin-shared";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import type { CompanyEShopTopBarSettings } from "@/features/e-shop-storefront/types/storefront.types";
import {
  eshopNavLinkKey,
  resolveEShopNavHref,
  sortEnabledNavLinks,
} from "@/features/e-shop-storefront/lib/resolve-nav-href";
import { EShopCompanyLogo } from "@/shared/components/EShopCompanyLogo";
import { EShopMobileNav } from "@/shared/components/EShopMobileNav";

type Props = {
  companyName: string;
  companyLogoUrl: string | null;
  topBar: CompanyEShopTopBarSettings;
  chromeIsLight?: boolean;
  customerPortalEnabled?: boolean;
};

export function EShopTopBar({
  companyName,
  companyLogoUrl,
  topBar,
  chromeIsLight = false,
  customerPortalEnabled = false,
}: Props) {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useEShopCart();
  const [logoFailed, setLogoFailed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showLogo = topBar.showLogo && Boolean(companyLogoUrl?.trim()) && !logoFailed;
  const navLinks = sortEnabledNavLinks(topBar.navLinks);

  return (
    <header className="sticky top-0 z-40 border-b border-chrome-foreground/10 bg-chrome text-chrome-foreground">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <EShopMobileNav
            navLinks={topBar.navLinks}
            pathname={pathname}
            open={mobileOpen}
            onOpenChange={setMobileOpen}
          />
          <Link href="/" className="flex min-w-0 items-center gap-2">
            {showLogo ? (
              <EShopCompanyLogo
                companyName={companyName}
                logoUrl={companyLogoUrl}
                size="sm"
                onPrimary={!chromeIsLight}
                onError={() => setLogoFailed(true)}
              />
            ) : null}
            {topBar.showCompanyName ? (
              <span className="truncate text-sm font-semibold text-chrome-foreground">
                {companyName}
              </span>
            ) : null}
          </Link>
        </div>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          {navLinks.map((item) => (
            <Link
              key={eshopNavLinkKey(item)}
              href={resolveEShopNavHref(item, pathname)}
              className="text-sm text-chrome-foreground/80 hover:text-chrome-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {customerPortalEnabled ? (
            <Link
              href="/cuenta"
              className="hidden text-sm text-chrome-foreground/80 hover:text-chrome-foreground md:inline"
            >
              Mi cuenta
            </Link>
          ) : null}
        {topBar.showCart ? (
          <div className="relative">
            <IconButton
              icon="ShoppingCart"
              variant="secondary"
              ariaLabel="Abrir carrito"
              onClick={openDrawer}
            />
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 translate-x-[7px] items-center justify-center rounded-full border-2 border-chrome bg-secondary px-1 text-[10px] font-bold text-primary">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="w-10 md:hidden" aria-hidden />
        )}
        </div>
      </div>
    </header>
  );
}
