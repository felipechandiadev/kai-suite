import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";

export default function RepartoLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Delivery"
      subtitle="Calendario, zonas, cobertura y tablero diario de repartos"
      compact
      data-test-id="reparto-layout"
    >
      {children}
    </TabPageLayout>
  );
}
