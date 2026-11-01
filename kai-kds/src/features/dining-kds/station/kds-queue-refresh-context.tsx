"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { KdsConnectionStatus } from "../realtime/kds-connection-state";

type QueueRefreshApi = {
  refresh: () => Promise<void>;
  loading: boolean;
  /** Socket cocina suscrito (null = cola no montada). */
  connected: boolean | null;
  /** Estado visible del socket (conectado / reconectando / sin conexión). */
  connectionStatus: KdsConnectionStatus;
};

type KdsQueueRefreshContextValue = {
  queueRefreshing: boolean;
  refreshQueue: (() => Promise<void>) | null;
  /** null si no hay panel de cola activo. */
  queueConnected: boolean | null;
  /** null si no hay panel de cola activo. */
  queueConnectionStatus: KdsConnectionStatus | null;
  setQueueRefreshApi: (api: QueueRefreshApi | null) => void;
};

const KdsQueueRefreshContext =
  createContext<KdsQueueRefreshContextValue | null>(null);

export function KdsQueueRefreshProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<QueueRefreshApi | null>(null);

  const setQueueRefreshApi = useCallback((next: QueueRefreshApi | null) => {
    setApi(next);
  }, []);

  const value = useMemo(
    () => ({
      queueRefreshing: api?.loading ?? false,
      refreshQueue: api?.refresh ?? null,
      queueConnected: api?.connected ?? null,
      queueConnectionStatus: api?.connectionStatus ?? null,
      setQueueRefreshApi,
    }),
    [api, setQueueRefreshApi],
  );

  return (
    <KdsQueueRefreshContext.Provider value={value}>
      {children}
    </KdsQueueRefreshContext.Provider>
  );
}

export function useKdsQueueRefresh(): KdsQueueRefreshContextValue {
  const ctx = useContext(KdsQueueRefreshContext);
  if (!ctx) {
    throw new Error(
      "useKdsQueueRefresh must be used within KdsQueueRefreshProvider",
    );
  }
  return ctx;
}
