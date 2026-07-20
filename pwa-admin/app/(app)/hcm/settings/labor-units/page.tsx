import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import { Alert } from "@kai/ui";
import { LaborUnitsPanel } from "./ui/LaborUnitsPanel";

export const dynamic = "force-dynamic";

export default async function HcmSettingsLaborUnitsPage() {
  const unitsRes = await listLaborUnitsAction({ includeInactive: true });
  if (!unitsRes.success) {
    return <Alert variant="error">{unitsRes.message}</Alert>;
  }
  return <LaborUnitsPanel initialUnits={unitsRes.data} />;
}
