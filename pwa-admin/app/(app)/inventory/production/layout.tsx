import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { ProductionTabs } from "./ui/ProductionTabs";

export default function ProductionLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      tabs={<ProductionTabs />}
      className="min-h-0 flex-1"
      contentClassName="flex min-h-0 flex-1 flex-col"
      data-test-id="inventory-production-layout"
    >
      {children}
    </TabPageLayout>
  );
}
