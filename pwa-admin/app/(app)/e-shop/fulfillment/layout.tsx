import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { FulfillmentTabs } from "./FulfillmentTabs";

export default function EShopFulfillmentLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Encargos y envíos"
      subtitle="Pedidos web, reparto local Maule, zonas, calendario y operación"
      tabs={<FulfillmentTabs />}
      compact
      data-test-id="e-shop-fulfillment-layout"
    >
      {children}
    </TabPageLayout>
  );
}
