"use client";

import { useEffect, useState } from "react";
import { usePosOffline } from "../hooks/use-pos-offline";
import { SyncQueuePanel } from "./SyncQueuePanel";

export function PosOfflineBanner() {
  const { isOffline, connectivity, pendingCount, failedCount } = usePosOffline();
  const [hydrated, setHydrated] = useState(false);
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated || !isOffline) return null;

  const detail = !connectivity.browserOnline
    ? "Sin conexión a internet."
    : "Sin conexión al servidor. Las ventas se guardan localmente.";

  const queueHint =
    pendingCount > 0 || failedCount > 0
      ? ` ${pendingCount + failedCount} venta(s) en cola de sincronización.`
      : "";

  return (
    <>
      <div
        role="status"
        className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
      >
        Modo offline — {detail}
        {" "}Descuentos y promociones deshabilitados.
        {queueHint ? (
          <button
            type="button"
            className="ml-1 underline font-medium"
            onClick={() => setSyncPanelOpen(true)}
          >
            Ver cola
          </button>
        ) : null}
      </div>
      <SyncQueuePanel open={syncPanelOpen} onOpenChange={setSyncPanelOpen} />
    </>
  );
}
