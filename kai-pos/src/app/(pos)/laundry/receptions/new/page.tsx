"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DotProgress } from "@kai/ui";
import { isKaiServicesEnabled } from "@/config/kaiservices-module.config";
import LaundryReceptionWorkspace from "@/features/laundry/ui/LaundryReceptionWorkspace";

const VIEWPORT_CLASS =
  "h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] max-h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] min-h-0";

function LaundryReceptionNewLoading() {
  return (
    <div className="flex min-h-[12rem] w-full items-center justify-center" data-test-id="laundry-reception-new-loading">
      <DotProgress />
    </div>
  );
}

function LaundryReceptionNewPageInner() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isKaiServicesEnabled()) {
      router.replace("/pos");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!isKaiServicesEnabled() || !allowed) {
    return null;
  }

  return (
    <div className={`w-full px-4 pb-6 ${VIEWPORT_CLASS}`} data-test-id="laundry-reception-new-page">
      <LaundryReceptionWorkspace />
    </div>
  );
}

export default function LaundryReceptionNewPage() {
  return (
    <Suspense fallback={<LaundryReceptionNewLoading />}>
      <LaundryReceptionNewPageInner />
    </Suspense>
  );
}
