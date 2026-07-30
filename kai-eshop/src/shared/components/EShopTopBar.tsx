"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconButton } from "@kai/ui";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import type { CompanyEShopTopBarSettings } from "@/features/e-shop-storefront/types/storefront.types";
import {
  eshopNavLinkKey,
  isEShopNavLinkActive,
  resolveEShopNavHref,
  sortEnabledNavLinks,
} from "@/features/e-shop-storefront/lib/resolve-nav-href";
import { EShopCompanyLogo } from "@/shared/components/EShopCompanyLogo";
import { EShopMobileNav } from "@/shared/components/EShopMobileNav";
import { EShopCustomerAuthLinks } from "@/features/e-shop-customer-account/ui/EShopCustomerAuthLinks";

type Props = {
  companyName: string;
  companyLogoUrl: string | null;
  topBar: CompanyEShopTopBarSettings;
  customerPortalEnabled?: boolean;
  customerLoggedIn?: boolean;
};

export function EShopTopBar({
  companyName,
  companyLogoUrl,
  topBar,
  customerPortalEnabled = false,
  customerLoggedIn = false,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navHydrated, setNavHydrated] = useState(false);
  const [cartBadgeReady, setCartBadgeReady] = useState(false);
  useEffect(() => {
    setNavHydrated(true);
    setCartBadgeReady(true);
  }, []);
  const currentCategoryId = navHydrated ? (searchParams.get("categoryId")?.trim() ?? "") : "";
  const { itemCount, cartHydrated, openDrawer } = useEShopCart();
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
            currentCategoryId={currentCategoryId}
            open={mobileOpen}
            onOpenChange={setMobileOpen}
            customerPortalEnabled={customerPortalEnabled}
            customerLoggedIn={customerLoggedIn}
          />
          <Link href="/" className="flex min-w-0 items-center gap-2">
            {showLogo ? (
              <EShopCompanyLogo
                companyName={companyName}
                logoUrl={companyLogoUrl}
                size="sm"
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
          {navLinks.map((item) => {
            const active = isEShopNavLinkActive(item, pathname, currentCategoryId);
            return (
            <Link
              key={eshopNavLinkKey(item)}
              href={resolveEShopNavHref(item, pathname)}
              className={`text-sm ${
                active
                  ? "font-medium text-chrome-foreground"
                  : "text-chrome-foreground/80 hover:text-chrome-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <EShopCustomerAuthLinks
            customerPortalEnabled={customerPortalEnabled}
            customerLoggedIn={customerLoggedIn}
            variant="desktop"
          />
        {topBar.showCart ? (
          <div className="relative">
            <IconButton
              icon="ShoppingCart"
              variant="secondary"
              ariaLabel="Abrir carrito"
              onClick={openDrawer}
            />
            {cartBadgeReady && cartHydrated && itemCount > 0 ? (
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
