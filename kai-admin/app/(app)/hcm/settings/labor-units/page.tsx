import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import { listOrganizationalUnitsAction } from "@/features/hr-organizational-units/actions/organizational-unit.action";
import { listProductionUnitsForPage } from "@/features/inventory-production-units/actions/production-unit.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { Alert } from "@kai/ui";
import { LaborUnitsPanel } from "./ui/LaborUnitsPanel";

export const dynamic = "force-dynamic";

export default async function HcmSettingsLaborUnitsPage() {
  const [unitsRes, branches, storages, orgUnits, productionUnits] = await Promise.all([
    listLaborUnitsAction({ includeInactive: true }),
    listBranchesForSettingsPage(),
    listStoragesForPage(),
    listOrganizationalUnitsAction({ includeInactive: true }),
    listProductionUnitsForPage(),
  ]);
  if (!unitsRes.success) {
    return <Alert variant="error">{unitsRes.message}</Alert>;
  }
  return (
    <LaborUnitsPanel
      initialUnits={unitsRes.data}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      storages={storages.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code ?? undefined,
      }))}
      organizationalUnits={orgUnits.map((o) => ({
        id: o.id,
        name: o.name,
        code: o.code,
      }))}
      productionUnits={productionUnits.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
      }))}
    />
  );
}
