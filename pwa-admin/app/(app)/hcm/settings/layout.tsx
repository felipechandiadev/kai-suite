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
      title="Configuración Capital Humano"
      tabs={<HcmSettingsNav />}
      className="min-h-0"
      contentClassName="pt-2"
      data-test-id="hcm-settings-layout"
    >
      {children}
    </TabPageLayout>
  );
}
