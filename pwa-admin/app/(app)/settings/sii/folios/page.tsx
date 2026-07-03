import {
  listFiscalCafPackagesAction,
  listFiscalEmissionsAction,
} from "@/features/fiscal/actions/fiscal.actions";
import { listPointsOfSaleForPage } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { SiiFoliosView } from "@/features/fiscal/ui/SiiFoliosView";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ package?: string }>;
};

export default async function SiiFoliosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const highlightPackageId = params.package?.trim() || null;

  const [packagesRes, emissionsRes, pointsOfSale] = await Promise.all([
    listFiscalCafPackagesAction(),
    listFiscalEmissionsAction({ limit: 25, offset: 0, environment: "production" }),
    listPointsOfSaleForPage(),
  ]);

  if (!emissionsRes.success) {
    return (
      <div className="min-h-0 p-0" data-test-id="settings-sii-folios-page-root">
        <p className="p-4 text-sm text-destructive">{emissionsRes.error}</p>
      </div>
    );
  }

  const packages = packagesRes.success ? (packagesRes.packages ?? []) : [];
  const packagesError = !packagesRes.success ? packagesRes.error : null;

  return (
    <div className="min-h-0 p-0" data-test-id="settings-sii-folios-page-root">
      {packagesError ? (
        <p className="mb-3 px-1 text-sm text-destructive">{packagesError}</p>
      ) : null}
      <SiiFoliosView
        packages={packages}
        pointsOfSale={pointsOfSale ?? []}
        highlightPackageId={highlightPackageId}
        initialEmissions={emissionsRes.items}
        initialTotal={emissionsRes.total}
      />
    </div>
  );
}
