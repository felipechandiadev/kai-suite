import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listProductionUnitsForPage } from "@/features/inventory-production-units/actions/production-unit.action";
import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import {
  listEmployeesForGridAction,
} from "@/features/hr-employees/actions/employee.action";
import { employeeDisplayName } from "@/features/hr-employees/types/employee.types";
import { ProductionUnitsCollection } from "../../inventory/production-units/ui/ProductionUnitsCollection";

export const dynamic = "force-dynamic";

export default async function ProductionUnitsPage() {
  const [units, branches, storages, laborUnitsRes, employees] =
    await Promise.all([
      listProductionUnitsForPage(),
      listBranchesForSettingsPage(),
      listStoragesForPage(),
      listLaborUnitsAction(),
      listEmployeesForGridAction({ status: "ACTIVE" }),
    ]);
  const laborUnits = laborUnitsRes.success
    ? laborUnitsRes.data.map((u) => ({
        id: u.id,
        name: u.name,
        code: u.code,
      }))
    : [];
  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: employeeDisplayName(e),
  }));

  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <ProductionUnitsCollection
        initialUnits={units}
        branches={branches}
        storages={storages}
        laborUnits={laborUnits}
        employees={employeeOptions}
      />
    </Suspense>
  );
}
