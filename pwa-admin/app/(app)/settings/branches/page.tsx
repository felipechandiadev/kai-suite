import { Suspense } from "react";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { SettingsBranchesCollection } from "./components/SettingsBranchesCollection";
import { LoadingState } from '@kai/ui';

/** Lista desde servidor en cada carga: necesario para que revalidate + router.refresh muestren cambios. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const branches = await listBranchesForSettingsPage();

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="branches-page-skeleton" />
      }
    >
      <SettingsBranchesCollection initialBranches={branches} />
    </Suspense>
  );
}
