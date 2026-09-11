import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { AnalyticsReportsTabs } from "./AnalyticsReportsTabs";

export default function AnalyticsReportsLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Reportes"
      subtitle="Ventas, compras e inventario."
      tabs={<AnalyticsReportsTabs />}
      className="min-h-0"
      data-test-id="analytics-reports-layout"
    >
      {children}
    </TabPageLayout>
  );
}
