import { BasicPageLayout } from "@kai/ui";
import { getAnalyticsDashboardAction } from "@/features/analytics/actions/analytics.action";
import { DashboardPanel } from "./ui/DashboardPanel";

export default async function DashboardPage() {
  const dashboard = await getAnalyticsDashboardAction({
    compare: "previous_period",
    trendMonths: 12,
  });

  return (
    <BasicPageLayout
      title="Panel"
      subtitle="Resumen consolidado del negocio. Los totales del mes van del 1 del mes actual hasta hoy."
      data-test-id="dashboard-page"
    >
      <DashboardPanel data={dashboard} />
    </BasicPageLayout>
  );
}
