"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DotProgress } from "@kai/ui";
import PosDiningAccountsPanel from "@/features/dining/ui/PosDiningAccountsPanel";
import { isKaiFoodEnabled } from "@/config/kaifood-module.config";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

/** Alto útil bajo topbar + padding del main (pt-4 + pb-6 ≈ 2.5rem). */
const ACCOUNTS_VIEWPORT_CLASS =
  "h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] max-h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] min-h-0";

function AccountsLoading() {
  return (
    <div
      className="flex min-h-[12rem] w-full items-center justify-center"
      data-test-id="pos-accounts-loading"
    >
      <DotProgress />
    </div>
  );
}

function AccountsPageInner() {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string>("");
  const [contextReady, setContextReady] = useState(false);

  useEffect(() => {
    if (!isKaiFoodEnabled()) {
      router.replace("/pos");
      return;
    }
    setBranchId(readPosContextClient()?.branchId?.trim() ?? "");
    setContextReady(true);
  }, [router]);

  if (!isKaiFoodEnabled()) {
    return null;
  }

  if (!contextReady) {
    return <AccountsLoading />;
  }

  if (!branchId) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="pos-accounts-no-branch">
        Configurá la caja / sucursal para ver cuentas.
      </p>
    );
  }

  return (
    <div className={`w-full ${ACCOUNTS_VIEWPORT_CLASS}`} data-test-id="pos-accounts-page">
      <PosDiningAccountsPanel branchId={branchId} layout="page" fillViewport />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsLoading />}>
      <AccountsPageInner />
    </Suspense>
  );
}
