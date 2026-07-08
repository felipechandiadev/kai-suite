"use client";

import { AlertTriangle, CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { usePosCompactLayout } from "@/shared/hooks/usePosCompactLayout";
import { usePosOffline } from "../hooks/use-pos-offline";
import { SyncQueuePanel } from "./SyncQueuePanel";

function badgeTone(args: {
  failedCount: number;
  pendingCount: number;
  isOffline: boolean;
}): "failed" | "pending" | "offline" {
  if (args.failedCount > 0) return "failed";
  if (args.pendingCount > 0) return "pending";
  if (args.isOffline) return "offline";
  return "offline";
}

const TONE_CLASS: Record<
  ReturnType<typeof badgeTone>,
  string
> = {
  failed:
    "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-300",
  pending:
    "border-sky-500/35 bg-sky-50 text-sky-950 dark:border-sky-500/50 dark:bg-sky-950/70 dark:text-sky-100",
  offline:
    "border-amber-500/40 bg-amber-50 text-amber-950 dark:border-amber-500/45 dark:bg-amber-950/70 dark:text-amber-100",
};

export function OfflineStatusBadge() {
  const { isOffline, pendingCount, failedCount } = usePosOffline();
  const compact = usePosCompactLayout();
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }

  if (!isOffline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  const tone = badgeTone({ failedCount, pendingCount, isOffline });

  const fullLabel =
    pendingCount > 0
      ? `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"} de sync`
      : failedCount > 0
        ? `${failedCount} error${failedCount === 1 ? "" : "es"} de sync`
        : "Sin conexión";

  const compactLabel =
    pendingCount > 0
      ? String(pendingCount)
      : failedCount > 0
        ? `!${failedCount}`
        : "Off";

  const label = compact ? compactLabel : fullLabel;

  const Icon = failedCount > 0 ? RefreshCw : pendingCount > 0 ? RefreshCw : CloudOff;

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${TONE_CLASS[tone]} ${
          compact ? "min-w-[2.75rem] justify-center" : "max-w-[200px]"
        }`}
        title={fullLabel}
        aria-label={fullLabel}
        data-test-id="pos-offline-status-badge"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className={compact ? "tabular-nums leading-none" : "truncate"}>{label}</span>
        {!compact && isOffline && pendingCount === 0 && failedCount === 0 ? (
          <AlertTriangle className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        ) : null}
      </button>
      <SyncQueuePanel open={panelOpen} onOpenChange={setPanelOpen} />
    </>
  );
}
