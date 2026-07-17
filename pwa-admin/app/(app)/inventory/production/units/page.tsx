import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listProductionUnitsForPage } from "@/features/inventory-production-units/actions/production-unit.action";
import { ProductionUnitsCollection } from "../../production-units/ui/ProductionUnitsCollection";

export const dynamic = "force-dynamic";

export default async function ProductionUnitsTabPage() {
  const [units, branches] = await Promise.all([
    listProductionUnitsForPage(),
    listBranchesForSettingsPage(),
  ]);

  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <ProductionUnitsCollection initialUnits={units} branches={branches} />
    </Suspense>
  );
}
