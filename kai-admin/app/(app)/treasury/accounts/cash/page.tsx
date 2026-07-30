import { Suspense } from "react";
import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { BranchRequest } from "@/features/settings-branches/infrastructure/branch.request";
import { PointOfSaleRequest } from "@/features/sales-points-of-sale/infrastructure/point-of-sale.request";
import { CashHubsRequest } from "@/features/treasury-cash-hubs/infrastructure/cash-hubs.request";
import { TreasuryCashHubMovementsRequest } from "@/features/treasury-cash-hubs/infrastructure/treasury-cash-hub-movements.request";
import { listCashSessionsAction } from "@/features/sales-cash-sessions/actions/cash-sessions-list.action";
import { ShareholderRequest } from "@/features/settings-shareholders/infrastructure/shareholder.request";
import { redirect } from "next/navigation";
import { resolveTreasuryCashHubSelection } from "./treasury-cash-hubs";
import { mapCashHubMovementsToGridRows, type TreasuryCashMovementGridRow } from "./treasury-cash-hub-movements-mapper";
import TreasuryCashTabContent from "./TreasuryCashTabContent";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function TreasuryCashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const company = await CompanyRequest.getDetails();
  const companyId = company?.id?.trim() ?? "";

  const [brRes, posRes, hubs, openSessionsRes, shareholders] = await Promise.all([
    companyId ? BranchRequest.findAll(false) : Promise.resolve({ success: true as const, branches: [] }),
    companyId ? PointOfSaleRequest.findAll(true) : Promise.resolve({ success: true as const, pointsOfSale: [] }),
    companyId ? CashHubsRequest.list(companyId) : Promise.resolve([]),
    companyId ? listCashSessionsAction({ status: "OPEN" }) : Promise.resolve({ success: false as const, error: "" }),
    companyId ? ShareholderRequest.list(companyId) : Promise.resolve([]),
  ]);

  const branches = brRes.success ? brRes.branches : [];
  const pointsOfSale = posRes.success ? posRes.pointsOfSale : [];

  const totalCashHubs = hubs.reduce(
    (sum, h) => sum + (typeof h.currentBalance === "number" ? h.currentBalance : 0),
    0,
  );
  const openSessions =
    openSessionsRes.success && "data" in openSessionsRes ? openSessionsRes.data.rows : [];
  const totalOpenCashSessions = openSessions.reduce((sum, s) => {
    const expected =
      typeof s.expectedAmount === "number" && Number.isFinite(s.expectedAmount)
        ? s.expectedAmount
        : null;
    const opening =
      typeof s.openingAmount === "number" && Number.isFinite(s.openingAmount)
        ? s.openingAmount
        : 0;
    return sum + (expected ?? opening);
  }, 0);

  if (!companyId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No hay empresa configurada. Defina la empresa para administrar centros de acopio.
      </div>
    );
  }

  const sp = await searchParams;
  const raw = sp.cashHub;
  const cashHubParam = Array.isArray(raw) ? raw[0] : raw;
  const { selectedId, mustRedirect } = resolveTreasuryCashHubSelection(hubs, cashHubParam);

  if (mustRedirect && selectedId) {
    redirect(`/treasury/accounts/cash?cashHub=${encodeURIComponent(selectedId)}`);
  }

  let movementRows: TreasuryCashMovementGridRow[] = [];
  let movementsTotal = 0;
  const selectedHubBalance =
    hubs.find((h) => String(h.id) === String(selectedId ?? ""))?.currentBalance ?? 0;
  if (selectedId) {
    try {
      const r = await TreasuryCashHubMovementsRequest.listByCashHubId({
        cashHubId: selectedId,
        page: 1,
        limit: 200,
      });
      movementRows = mapCashHubMovementsToGridRows(r.rows, selectedHubBalance);
      movementsTotal = r.total;
    } catch {
      movementRows = [];
      movementsTotal = 0;
    }
  }

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 py-4" data-test-id="treasury-cash-page-suspense" />
      }
    >
      <TreasuryCashTabContent
        company={company}
        hubs={hubs}
        selectedCashHubId={selectedId}
        movementRows={movementRows}
        movementsTotal={movementsTotal}
        branches={branches}
        pointsOfSale={pointsOfSale}
        totalCashHubs={totalCashHubs}
        totalOpenCashSessions={totalOpenCashSessions}
        openCashSessionsCount={openSessions.length}
        shareholders={shareholders}
      />
    </Suspense>
  );
}
