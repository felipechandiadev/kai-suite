import { Suspense } from "react";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { StoragesCollection } from "./components/StoragesCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const [initialStorages, branches] = await Promise.all([listStoragesForPage(), listBranchesForSettingsPage()]);

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="storages-page-skeleton" />
      }
    >
      <StoragesCollection initialStorages={initialStorages} branches={branches} />
    </Suspense>
  );
}
