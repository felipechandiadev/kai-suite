import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { KaiMenuTabs } from "./KaiMenuTabs";

export default function KaiMenuLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="KaiMenú"
      subtitle="Contenido y apariencia de la carta pública"
      tabs={<KaiMenuTabs />}
      compact
      data-test-id="kai-menu-layout"
    >
      {children}
    </TabPageLayout>
  );
}
