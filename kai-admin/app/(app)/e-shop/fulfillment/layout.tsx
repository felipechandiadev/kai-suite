import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { FulfillmentTabs } from "./FulfillmentTabs";

export default function EShopFulfillmentLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Encargos y envíos"
      subtitle="Pedidos web y métodos de entrega del checkout"
      tabs={<FulfillmentTabs />}
      compact
      data-test-id="e-shop-fulfillment-layout"
    >
      {children}
    </TabPageLayout>
  );
}
