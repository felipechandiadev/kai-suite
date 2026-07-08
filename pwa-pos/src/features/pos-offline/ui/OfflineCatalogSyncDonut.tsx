"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, useState } from "react";
import { readPosContextClient, POS_CONTEXT_CHANGED_EVENT } from "@/features/session/lib/pos-context-storage";
import { getOfflineCatalogStatus } from "../application/catalog-readiness.usecase";
import { triggerManualOfflineBootstrap } from "../application/manual-offline-bootstrap.usecase";
import { usePosOffline } from "../hooks/use-pos-offline";
import {
  catalogDownloadPercent,
  catalogIdbPercent,
  failCatalogSync,
  formatCatalogSyncTooltip,
  getCatalogSyncProgress,
  hydrateCatalogSyncFromCounts,
  subscribeCatalogSyncProgress,
  type CatalogSyncProgress,
} from "../lib/offline-catalog-sync-progress";

const OUTER_R = 10;
const INNER_R = 6;
const OUTER_C = 2 * Math.PI * OUTER_R;
const INNER_C = 2 * Math.PI * INNER_R;

function ringDash(pct: number, circumference: number): string {
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * circumference;
  return `${filled.toFixed(2)} ${circumference.toFixed(2)}`;
}

type RingColors = {
  outer: string;
  inner: string;
  track: string;
};

function colorsForPhase(phase: CatalogSyncProgress["phase"]): RingColors {
  if (phase === "error") {
    return {
      outer: "stroke-red-500",
      inner: "stroke-red-400",
      track: "stroke-current opacity-20",
    };
  }
  if (phase === "ready") {
    return {
      outer: "stroke-emerald-500",
      inner: "stroke-emerald-400",
      track: "stroke-current opacity-20",
    };
  }
  return {
    outer: "stroke-sky-500",
    inner: "stroke-emerald-500",
    track: "stroke-current opacity-20",
  };
}

function DualRingSvg({ progress }: { progress: CatalogSyncProgress }) {
  const dlPct = catalogDownloadPercent(progress);
  const idbPct = catalogIdbPercent(progress);
  const colors = colorsForPhase(progress.phase);

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className="shrink-0 text-muted-foreground"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r={OUTER_R}
        fill="none"
        className={colors.track}
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r={OUTER_R}
        fill="none"
        className={colors.outer}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={ringDash(dlPct, OUTER_C)}
        transform="rotate(-90 12 12)"
      />
      <circle
        cx="12"
        cy="12"
        r={INNER_R}
        fill="none"
        className={colors.track}
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r={INNER_R}
        fill="none"
        className={colors.inner}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={ringDash(idbPct, INNER_C)}
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

function useCatalogSyncProgressStore(): CatalogSyncProgress {
  return useSyncExternalStore(
    subscribeCatalogSyncProgress,
    getCatalogSyncProgress,
    getCatalogSyncProgress,
  );
}

export function OfflineCatalogSyncDonut() {
  const progress = useCatalogSyncProgressStore();
  const { isBackendReachable } = usePosOffline();
  const bootstrapInFlightRef = useRef(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const refreshFromMeta = useCallback(async () => {
    const ctx = readPosContextClient();
    const posId = ctx?.pointOfSaleId?.trim();
    const priceListId = ctx?.priceListId?.trim();
    if (!posId || !priceListId) return;
    const status = await getOfflineCatalogStatus(posId, priceListId);
    hydrateCatalogSyncFromCounts({ ready: status.ready, rowCount: status.rowCount });
  }, []);

  useEffect(() => {
    void refreshFromMeta();
    const interval = setInterval(() => void refreshFromMeta(), 15_000);
    const onContext = () => void refreshFromMeta();
    window.addEventListener(POS_CONTEXT_CHANGED_EVENT, onContext);
    return () => {
      clearInterval(interval);
      window.removeEventListener(POS_CONTEXT_CHANGED_EVENT, onContext);
    };
  }, [refreshFromMeta]);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => setActionMessage(null), 8_000);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  const handleManualBootstrap = useCallback(async () => {
    if (bootstrapInFlightRef.current || progress.phase === "syncing") return;

    const ctx = readPosContextClient();
    const posId = ctx?.pointOfSaleId?.trim();
    const priceListId = ctx?.priceListId?.trim();
    if (!posId || !priceListId) {
      setActionMessage("Sin contexto de punto de venta.");
      return;
    }

    if (!isBackendReachable) {
      setActionMessage("Sin conexión. No se puede sincronizar datos offline.");
      return;
    }

    bootstrapInFlightRef.current = true;
    setActionMessage(null);
    try {
      const result = await triggerManualOfflineBootstrap(posId, priceListId);
      if (result.success) {
        const warning =
          result.warnings.length > 0 ? ` Aviso: ${result.warnings[0]}` : "";
        setActionMessage(
          `Datos offline actualizados (${result.catalogTotal} productos).${warning}`,
        );
        await refreshFromMeta();
      } else {
        failCatalogSync();
        setActionMessage(result.message);
        await refreshFromMeta();
      }
    } finally {
      bootstrapInFlightRef.current = false;
    }
  }, [isBackendReachable, progress.phase, refreshFromMeta]);

  const baseTooltip = formatCatalogSyncTooltip(progress);
  const tooltip = actionMessage
    ? actionMessage
    : isBackendReachable
      ? `${baseTooltip} · Clic para sincronizar datos offline`
      : `${baseTooltip} · Requiere conexión para sincronizar`;

  const showPulse = progress.phase === "syncing";
  const canSync = isBackendReachable && progress.phase !== "syncing";

  return (
    <button
      type="button"
      onClick={() => void handleManualBootstrap()}
      disabled={!canSync}
      className={`inline-flex items-center justify-center rounded-md border border-transparent bg-transparent p-1 transition-colors ${
        canSync
          ? "cursor-pointer hover:border-border active:border-border"
          : "cursor-default opacity-90"
      } ${showPulse ? "animate-pulse" : ""}`}
      title={tooltip}
      aria-label={tooltip}
      data-test-id="pos-topbar-catalog-sync-donut"
    >
      <DualRingSvg progress={progress} />
    </button>
  );
}
