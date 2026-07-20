import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui/components/layouts/TabPageLayout";
import { HcmSettingsNav } from "./HcmSettingsNav";

export default function HcmSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TabPageLayout
      compact
      title="Capital humano"
      subtitle="Parámetros de jornada, contratos, cargos, unidades organizativas y laborales."
      tabs={<HcmSettingsNav />}
      className="min-h-0"
      data-test-id="hcm-settings-layout"
    >
      {children}
    </TabPageLayout>
  );
}
