"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DotProgress } from "@kai/ui";
import { isKaiServicesEnabled } from "@/config/kaiservices-module.config";
import LaundryReceptionDetail from "@/features/laundry/ui/LaundryReceptionDetail";

const VIEWPORT_CLASS =
  "h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] max-h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] min-h-0";

function LaundryReceptionDetailLoading() {
  return (
    <div className="flex min-h-[12rem] w-full items-center justify-center" data-test-id="laundry-reception-detail-page-loading">
      <DotProgress />
    </div>
  );
}

function LaundryReceptionDetailPageInner({ receptionId }: { receptionId: string }) {
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
    <div className={`w-full px-4 pb-6 ${VIEWPORT_CLASS}`} data-test-id="laundry-reception-detail-page">
      <LaundryReceptionDetail receptionId={receptionId} />
    </div>
  );
}

export default function LaundryReceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense fallback={<LaundryReceptionDetailLoading />}>
      <LaundryReceptionDetailPageInner receptionId={id} />
    </Suspense>
  );
}
