"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import type { EShopNavLink } from "@/features/e-shop-storefront/types/storefront.types";
import {
  eshopNavLinkKey,
  isEShopNavLinkActive,
  resolveEShopNavHref,
  sortEnabledNavLinks,
} from "@/features/e-shop-storefront/lib/resolve-nav-href";
import { EShopCustomerAuthLinks } from "@/features/e-shop-customer-account/ui/EShopCustomerAuthLinks";

type Props = {
  navLinks: EShopNavLink[];
  pathname: string;
  currentCategoryId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerPortalEnabled?: boolean;
  customerLoggedIn?: boolean;
};

export function EShopMobileNav({
  navLinks,
  pathname,
  currentCategoryId = "",
  open,
  onOpenChange,
  customerPortalEnabled = false,
  customerLoggedIn = false,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const links = sortEnabledNavLinks(navLinks);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-2 md:hidden"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => onOpenChange(false)}
          />
          <nav
            ref={panelRef}
            className="absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col gap-1 border-r border-chrome-foreground/10 bg-chrome p-6 pt-16 text-chrome-foreground shadow-xl"
            aria-label="Menú principal"
          >
            {links.map((item) => {
              const active = isEShopNavLinkActive(item, pathname, currentCategoryId);
              return (
              <Link
                key={eshopNavLinkKey(item)}
                href={resolveEShopNavHref(item, pathname)}
                className={`rounded-md px-3 py-3 text-base ${
                  active
                    ? "bg-chrome-foreground/10 font-medium text-chrome-foreground"
                    : "text-chrome-foreground/90 hover:bg-chrome-foreground/10 hover:text-chrome-foreground"
                }`}
                aria-current={active ? "page" : undefined}
                onClick={() => onOpenChange(false)}
              >
                {item.label}
              </Link>
              );
            })}
            <EShopCustomerAuthLinks
              customerPortalEnabled={customerPortalEnabled}
              customerLoggedIn={customerLoggedIn}
              variant="mobile"
              onNavigate={() => onOpenChange(false)}
            />
          </nav>
        </div>
      ) : null}
    </>
  );
}
