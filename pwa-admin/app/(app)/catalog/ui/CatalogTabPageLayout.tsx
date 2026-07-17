"use client";

import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { CatalogTabs } from "./CatalogTabs";

export function CatalogTabPageLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      tabs={<CatalogTabs />}
      className="min-h-0"
      data-test-id="catalog-layout"
    >
      {children}
    </TabPageLayout>
  );
}
