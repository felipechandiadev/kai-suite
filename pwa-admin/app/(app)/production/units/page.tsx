import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listProductionUnitsForPage } from "@/features/inventory-production-units/actions/production-unit.action";
import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import { ProductionUnitsCollection } from "../../inventory/production-units/ui/ProductionUnitsCollection";

export const dynamic = "force-dynamic";

export default async function ProductionUnitsPage() {
  const [units, branches, storages, laborUnitsRes] = await Promise.all([
    listProductionUnitsForPage(),
    listBranchesForSettingsPage(),
    listStoragesForPage(),
    listLaborUnitsAction(),
  ]);
  const laborUnits = laborUnitsRes.success
    ? laborUnitsRes.data.map((u) => ({
        id: u.id,
        name: u.name,
        code: u.code,
      }))
    : [];

  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <ProductionUnitsCollection
        initialUnits={units}
        branches={branches}
        storages={storages}
        laborUnits={laborUnits}
      />
    </Suspense>
  );
}
