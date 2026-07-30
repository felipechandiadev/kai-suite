import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { DiningNumberingSettingsPanel } from "./ui/DiningNumberingSettingsPanel";

export const dynamic = "force-dynamic";

export default async function Page() {
  const branches = await listBranchesForSettingsPage();

  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <DiningNumberingSettingsPanel branches={branches} />
    </Suspense>
  );
}
