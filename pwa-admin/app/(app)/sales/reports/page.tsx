import { listPointsOfSaleForPage } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { listCashSessionsAction } from "@/features/sales-cash-sessions/actions/cash-sessions-list.action";
import { CASH_SESSION_STATUS_LABEL } from "@/features/sales-cash-sessions/types/cash-session-list.types";
import { SalesReportsWorkspace } from "@/features/sales-reports/ui/SalesReportsWorkspace";

export default async function SalesReportsPage() {
  const [pointsOfSale, sessionsRes] = await Promise.all([
    listPointsOfSaleForPage(),
    listCashSessionsAction({}),
  ]);

  const cashSessions = (sessionsRes.success ? sessionsRes.data.rows : []).map((s) => ({
    id: s.id,
    label: `${s.pointOfSaleName ?? "POS"} · ${CASH_SESSION_STATUS_LABEL[s.status]} · ${new Date(
      s.openedAt,
    ).toLocaleString("es-CL")}`,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4" data-test-id="sales-reports-page-root">
      <SalesReportsWorkspace pointsOfSale={pointsOfSale} cashSessions={cashSessions} />
    </div>
  );
}
