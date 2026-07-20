import { Suspense } from "react";
import { listOrganizationalUnitsAction } from "@/features/hr-organizational-units/actions/organizational-unit.action";
import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import { OrganizationalUnitsCollection } from "../../../hcm/organizational-units/ui/OrganizationalUnitsCollection";
import { LoadingState } from "@kai/ui";

export const dynamic = "force-dynamic";

/** Legacy path; redirected to /hcm/settings/organizational-units via next.config. */
export default async function SettingsHcmOrgUnitsPage() {
  const [units, laborUnitsRes] = await Promise.all([
    listOrganizationalUnitsAction({ includeInactive: true }),
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
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center py-4" />
      }
    >
      <OrganizationalUnitsCollection
        initialUnits={units}
        includeInactive
        embedded
        laborUnits={laborUnits}
      />
    </Suspense>
  );
}
