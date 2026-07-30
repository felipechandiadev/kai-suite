import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { DteMainTabs } from "./DteMainTabs";

export default function DteProveedorLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout title="DTE's proveedor" tabs={<DteMainTabs />}
      className="min-h-0"
      data-test-id="purchasing-dte-layout"
    >
      {children}
    </TabPageLayout>
  );
}
