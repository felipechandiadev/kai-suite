import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listProductionUnitsForPage } from "@/features/inventory-production-units/actions/production-unit.action";
import { CreateProductionForm } from "./ui/CreateProductionForm";

export const dynamic = "force-dynamic";

export default async function NewProductionOrderPage() {
  const [branches, storages, productionUnits] = await Promise.all([
    listBranchesForSettingsPage(),
    listStoragesForPage(),
    listProductionUnitsForPage(),
  ]);
  return (
    <CreateProductionForm
      storages={storages}
      productionUnits={productionUnits}
      fallbackBranchId={branches[0]?.id ?? null}
    />
  );
}
