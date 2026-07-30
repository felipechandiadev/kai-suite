"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";

import type { StockUpdatedPayload } from "../lib/stock-alert-copy";
import { isUnauthorizedResponse, signOutSessionExpired } from "@/lib/auth/sign-out-session-expired";

export type { StockUpdatedPayload };

type StockRealtimeContextValue = {
  stockAlertCount: number;
  lastStockEvents: Array<StockUpdatedPayload & { receivedAt?: number }>;
  clearStockAlerts: () => void;
};

const StockRealtimeContext = createContext<StockRealtimeContextValue>({
  stockAlertCount: 0,
  lastStockEvents: [],
  clearStockAlerts: () => {},
});

export function useStockRealtime() {
  return useContext(StockRealtimeContext);
}

function clientBackendBaseUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, "");
}

export function StockRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [lastStockEvents, setLastStockEvents] = useState<
    Array<StockUpdatedPayload & { receivedAt?: number }>
  >([]);
  const socketRef = useRef<Socket | null>(null);

  const activeCompanyId =
    (session?.user as { activeCompanyId?: string | null })?.activeCompanyId ?? null;

  const clearStockAlerts = useCallback(() => {
    setLastStockEvents([]);
  }, []);

  /** Alertas actuales desde API (carga / recarga / cambio de empresa), alineadas al payload WS. */
  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    const base = clientBackendBaseUrl();
    const token = session?.user?.accessToken;
    if (!base || !token) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };
        if (activeCompanyId) {
          headers["X-Active-Company-Id"] = activeCompanyId;
        }
        const res = await fetch(`${base}/api/inventory/threshold-alerts`, {
          headers,
          credentials: "include",
        });
        if (cancelled) {
          return;
        }
        if (isUnauthorizedResponse(res)) {
          signOutSessionExpired();
          return;
        }
        if (!res.ok) {
          return;
        }
        const json = (await res.json()) as { items?: StockUpdatedPayload[] };
        const items = Array.isArray(json?.items) ? json.items : [];
        const now = Date.now();
        const rows = items.map((p) => ({ ...p, receivedAt: now }));
        setLastStockEvents(rows);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.accessToken, activeCompanyId]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    const base = clientBackendBaseUrl();
    const userId = session?.user?.accessToken;
    if (!base || !userId) {
      return;
    }

    const socket = io(`${base}/realtime/stock`, {
      transports: ["websocket"],
      auth: {
        userId,
        activeCompanyId,
      },
    });
    socketRef.current = socket;

    const subscribeAllStorages = async () => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userId}`,
        };
        if (activeCompanyId) {
          headers["X-Active-Company-Id"] = activeCompanyId;
        }
        const res = await fetch(`${base}/api/inventory/filters`, {
          headers,
          credentials: "include",
        });
        if (isUnauthorizedResponse(res)) {
          signOutSessionExpired();
          return;
        }
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { storages?: Array<{ id?: string }> };
        const storages = Array.isArray(data?.storages) ? data.storages : [];
        const storageIds = storages.map((s) => String(s?.id || "").trim()).filter(Boolean);
        socket.emit("subscribeStorages", { storageIds });
      } catch {
        // ignore
      }
    };

    const onConnect = () => {
      void subscribeAllStorages();
    };

    const onStockUpdated = (payload: StockUpdatedPayload) => {
      const row: StockUpdatedPayload & { receivedAt: number } = {
        ...payload,
        receivedAt: Date.now(),
      };
      setLastStockEvents((prev) => [row, ...prev].slice(0, 50));
    };

    const onAuthError = () => {
      signOutSessionExpired();
    };

    const onConnectError = (err: Error) => {
      const m = (err?.message ?? "").toLowerCase();
      if (
        m.includes("401") ||
        m.includes("unauthorized") ||
        m.includes("sesión inválida") ||
        m.includes("sesion invalida")
      ) {
        signOutSessionExpired();
      }
    };

    socket.on("connect", onConnect);
    socket.on("stock:updated", onStockUpdated);
    socket.on("auth_error", onAuthError);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("stock:updated", onStockUpdated);
      socket.off("auth_error", onAuthError);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [status, session?.user?.accessToken, activeCompanyId]);

  const value = useMemo(
    () => ({
      stockAlertCount: lastStockEvents.filter((e) => Array.isArray(e.alerts) && e.alerts.length > 0).length,
      lastStockEvents,
      clearStockAlerts,
    }),
    [lastStockEvents, clearStockAlerts],
  );

  return <StockRealtimeContext.Provider value={value}>{children}</StockRealtimeContext.Provider>;
}
