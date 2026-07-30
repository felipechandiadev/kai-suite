"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DotProgress } from "@kai/ui";
import { isKaiServicesEnabled } from "@/config/kaiservices-module.config";
import LaundryReceptionsList from "@/features/laundry/ui/LaundryReceptionsList";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

const VIEWPORT_CLASS =
  "h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] max-h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] min-h-0";

function LaundryReceptionsLoading() {
  return (
    <div className="flex min-h-[12rem] w-full items-center justify-center" data-test-id="laundry-receptions-loading">
      <DotProgress />
    </div>
  );
}

function LaundryReceptionsPageInner() {
  const router = useRouter();
  const [branchId, setBranchId] = useState("");
  const [contextReady, setContextReady] = useState(false);

  useEffect(() => {
    if (!isKaiServicesEnabled()) {
      router.replace("/pos");
      return;
    }
    setBranchId(readPosContextClient()?.branchId?.trim() ?? "");
    setContextReady(true);
  }, [router]);

  if (!isKaiServicesEnabled()) {
    return null;
  }

  if (!contextReady) {
    return <LaundryReceptionsLoading />;
  }

  if (!branchId) {
    return (
      <p className="px-4 text-sm text-muted-foreground" data-test-id="laundry-receptions-no-branch">
        Configurá la caja / sucursal para ver recepciones.
      </p>
    );
  }

  return (
    <div className={`w-full px-4 pb-6 ${VIEWPORT_CLASS}`} data-test-id="laundry-receptions-page">
      <LaundryReceptionsList branchId={branchId} />
    </div>
  );
}

export default function LaundryReceptionsPage() {
  return (
    <Suspense fallback={<LaundryReceptionsLoading />}>
      <LaundryReceptionsPageInner />
    </Suspense>
  );
}
