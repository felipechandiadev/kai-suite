"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TabPageLayout } from "@kai/ui";
import { CatalogTabs } from "./CatalogTabs";
import { CatalogLayoutTitle } from "./CatalogLayoutTitle";

function shouldHideCatalogHeading(pathname: string): boolean {
  return (
    pathname === "/catalog/products" ||
    pathname.startsWith("/catalog/products/") ||
    pathname === "/catalog/categories" ||
    pathname.startsWith("/catalog/categories/") ||
    pathname === "/catalog/brands" ||
    pathname.startsWith("/catalog/brands/") ||
    pathname === "/catalog/attributes" ||
    pathname.startsWith("/catalog/attributes/")
  );
}

export function CatalogTabPageLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideHeading = shouldHideCatalogHeading(pathname);

  return (
    <TabPageLayout
      title={hideHeading ? undefined : <CatalogLayoutTitle />}
      subtitle={hideHeading ? undefined : "Catálogo"}
      tabs={<CatalogTabs />}
      className="min-h-0"
      data-test-id="catalog-layout"
    >
      {children}
    </TabPageLayout>
  );
}
