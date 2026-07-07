"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { usePosOffline } from "../hooks/use-pos-offline";
import { SyncQueuePanel } from "./SyncQueuePanel";

export function OfflineStatusBadge() {
  const { isOffline, pendingCount, failedCount } = usePosOffline();
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Evita hydration mismatch: conectividad/cola solo existen en cliente.
  if (!hydrated) {
    return null;
  }

  if (!isOffline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  const label =
    pendingCount > 0
      ? `${pendingCount} venta${pendingCount === 1 ? "" : "s"} por sincronizar`
      : isOffline
        ? "Sin conexión al servidor"
        : failedCount > 0
          ? `${failedCount} error${failedCount === 1 ? "" : "es"} de sync`
          : "Sin conexión al servidor";

  const variant = failedCount > 0 ? "destructive" : "secondary";

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          variant === "destructive"
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground"
        }`}
        title={label}
      >
        {failedCount > 0 ? (
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <CloudOff className="h-3.5 w-3.5" aria-hidden />
        )}
        <span className="max-w-[180px] truncate">{label}</span>
      </button>
      <SyncQueuePanel open={panelOpen} onOpenChange={setPanelOpen} />
    </>
  );
}
