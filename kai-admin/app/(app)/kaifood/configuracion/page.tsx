import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { LoadingState } from "@kai/ui";
import { authOptions } from "@/lib/auth/auth-options";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { DiningNumberingSettingsPanel } from "./ui/DiningNumberingSettingsPanel";
import { KaifoodTipsSettingsPanel } from "./ui/KaifoodTipsSettingsPanel";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [branches, session] = await Promise.all([
    listBranchesForSettingsPage(),
    getServerSession(authOptions),
  ]);
  const companyId =
    (session?.user as { activeCompanyId?: string | null } | undefined)
      ?.activeCompanyId ?? "";

  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-xl font-semibold text-foreground">
          Configuración KaiFood
        </h1>
        {companyId ? (
          <KaifoodTipsSettingsPanel companyId={companyId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Seleccioná una empresa activa para configurar propinas.
          </p>
        )}
        <DiningNumberingSettingsPanel branches={branches} />
      </div>
    </Suspense>
  );
}
