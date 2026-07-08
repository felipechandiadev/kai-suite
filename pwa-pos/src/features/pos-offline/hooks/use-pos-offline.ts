"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import {
  getConnectivityState,
  startConnectivityHeartbeat,
  subscribeConnectivity,
  type ConnectivityState,
} from "../infrastructure/connectivity";
import { countPendingCommands, listOfflineCommands } from "../application/enqueue-sale.usecase";
import {
  subscribeSyncQueueEvents,
  syncOfflineQueueOnce,
  type SyncQueueEvent,
} from "../application/sync-queue.usecase";
import { runBootstrapCoordinator } from "../application/bootstrap-coordinator.usecase";
import { applyCatalogDeltaForPos } from "../application/download-catalog-delta.usecase";
import { getCatalogMeta } from "../application/catalog-readiness.usecase";
import type { PosOfflineCommand } from "../domain/offline-command.types";
import { resolveSyncUserName } from "../lib/resolve-sync-user-name";

export function usePosOffline() {
  const { data: session } = useSession();
  const userName = resolveSyncUserName(session);

  const [connectivity, setConnectivity] = useState<ConnectivityState>(() => getConnectivityState());
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [commands, setCommands] = useState<PosOfflineCommand[]>([]);
  const [lastSyncedDocument, setLastSyncedDocument] = useState<string | null>(null);
  const [authExpiredMessage, setAuthExpiredMessage] = useState<string | null>(null);
  const [catalogRefreshMessage, setCatalogRefreshMessage] = useState<string | null>(null);
  const wasBackendReachableRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    const all = await listOfflineCommands();
    setCommands(all);
    const pending = all.filter((c) =>
      ["PENDING", "SYNCING", "FAILED"].includes(c.status),
    ).length;
    const failed = all.filter((c) => c.status === "FAILED" || c.status === "CONFLICT").length;
    setPendingCount(pending);
    setFailedCount(failed);
  }, []);

  useEffect(() => {
    startConnectivityHeartbeat();
    const unsub = subscribeConnectivity(setConnectivity);
    void refreshQueue();
    const interval = setInterval(() => void refreshQueue(), 5_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refreshQueue]);

  useEffect(() => {
    const onEvent = (event: SyncQueueEvent) => {
      if (event.type === "SYNCED") {
        setLastSyncedDocument(event.documentNumber);
      }
      if (event.type === "AUTH_EXPIRED") {
        setAuthExpiredMessage("Sesión expirada. Inicia sesión con red.");
      }
    };
    return subscribeSyncQueueEvents(onEvent);
  }, []);

  useEffect(() => {
    const reachable = connectivity.browserOnline && connectivity.backendReachable;
    if (reachable && !wasBackendReachableRef.current) {
      const ctx = readPosContextClient();
      if (ctx?.pointOfSaleId && ctx.priceListId) {
        void (async () => {
          const meta = await getCatalogMeta(ctx.pointOfSaleId!, ctx.priceListId!);
          if (meta?.snapshotAt) {
            const delta = await applyCatalogDeltaForPos(
              ctx.pointOfSaleId!,
              ctx.priceListId!,
              meta.snapshotAt,
            );
            if (delta.success) {
              setCatalogRefreshMessage(
                delta.updated > 0
                  ? `Catálogo actualizado (+${delta.updated} cambios).`
                  : "Catálogo verificado al reconectar.",
              );
            } else {
              const bootstrap = await runBootstrapCoordinator(ctx.pointOfSaleId!, ctx.priceListId!);
              if (bootstrap.catalog === "ok") {
                setCatalogRefreshMessage("Catálogo offline actualizado.");
              } else {
                setCatalogRefreshMessage(bootstrap.catalogMessage ?? "No se pudo actualizar el catálogo.");
              }
            }
          } else {
            const bootstrap = await runBootstrapCoordinator(ctx.pointOfSaleId!, ctx.priceListId!);
            if (bootstrap.catalog === "ok") {
              setCatalogRefreshMessage("Catálogo offline descargado.");
            }
          }
        })();
      }
    }
    wasBackendReachableRef.current = reachable;
  }, [connectivity.backendReachable, connectivity.browserOnline]);

  useEffect(() => {
    if (!connectivity.backendReachable || !userName) return;
    void syncOfflineQueueOnce(userName).then(() => refreshQueue());
  }, [connectivity.backendReachable, userName, refreshQueue]);

  const isOffline = !connectivity.browserOnline || !connectivity.backendReachable;

  return {
    connectivity,
    isOffline,
    isBackendReachable: connectivity.browserOnline && connectivity.backendReachable,
    pendingCount,
    failedCount,
    commands,
    refreshQueue,
    userName,
    lastSyncedDocument,
    authExpiredMessage,
    catalogRefreshMessage,
    clearLastSyncedDocument: () => setLastSyncedDocument(null),
    clearAuthExpiredMessage: () => setAuthExpiredMessage(null),
    clearCatalogRefreshMessage: () => setCatalogRefreshMessage(null),
  };
}

export async function refreshOfflinePendingCount(): Promise<number> {
  return countPendingCommands();
}
