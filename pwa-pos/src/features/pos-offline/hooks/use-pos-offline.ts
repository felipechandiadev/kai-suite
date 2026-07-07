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
import { downloadFiscalPackForPos } from "../application/download-fiscal-pack.usecase";
import { downloadCatalogSnapshotForPos } from "../application/download-catalog-snapshot.usecase";
import type { PosOfflineSaleCommand } from "../domain/offline-command.types";

export function usePosOffline() {
  const { data: session } = useSession();
  const userName =
    session?.user?.name?.trim() ||
    session?.user?.email?.trim() ||
    (session?.user as { userName?: string } | undefined)?.userName?.trim() ||
    "";

  const [connectivity, setConnectivity] = useState<ConnectivityState>(() => getConnectivityState());
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [commands, setCommands] = useState<PosOfflineSaleCommand[]>([]);
  const [lastSyncedDocument, setLastSyncedDocument] = useState<string | null>(null);
  const [authExpiredMessage, setAuthExpiredMessage] = useState<string | null>(null);
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
      if (ctx?.pointOfSaleId) {
        void downloadFiscalPackForPos(ctx.pointOfSaleId);
        if (ctx.priceListId) {
          void downloadCatalogSnapshotForPos(ctx.pointOfSaleId, ctx.priceListId);
        }
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
    clearLastSyncedDocument: () => setLastSyncedDocument(null),
    clearAuthExpiredMessage: () => setAuthExpiredMessage(null),
  };
}

export async function refreshOfflinePendingCount(): Promise<number> {
  return countPendingCommands();
}
