import { Suspense } from "react";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import { StoragesCollection } from "./components/StoragesCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const [initialStorages, branches, laborUnitsRes] = await Promise.all([
    listStoragesForPage(),
    listBranchesForSettingsPage(),
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
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="storages-page-skeleton" />
      }
    >
      <StoragesCollection
        initialStorages={initialStorages}
        branches={branches}
        laborUnits={laborUnits}
      />
    </Suspense>
  );
}
