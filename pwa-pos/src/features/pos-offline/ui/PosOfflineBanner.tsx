"use client";

import { usePosOffline } from "../hooks/use-pos-offline";

export function PosOfflineBanner() {
  const { isOffline, connectivity } = usePosOffline();

  if (!isOffline) return null;

  const detail =
    !connectivity.browserOnline
      ? "Sin conexión a internet."
      : "Sin conexión al servidor. Las ventas se guardan localmente.";

  return (
    <div
      role="status"
      className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
    >
      Modo offline — {detail}
    </div>
  );
}
