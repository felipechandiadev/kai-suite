import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui/components/layouts/TabPageLayout";
import { CatalogTabs } from "./ui/CatalogTabs";

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Catálogo"
      tabs={<CatalogTabs />}
      className="min-h-0"
      data-test-id="catalog-layout"
    >
      {children}
    </TabPageLayout>
  );
}
