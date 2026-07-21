"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { getClientBackendApiBase } from "@/lib/backend-api-url";
import type {
  DiningOrderKind,
  DiningOrderStatus,
  KitchenItemStatus,
} from "@/features/dining/types/dining-pos.types";

export type DiningSessionLinePayload = {
  id: string;
  productVariantId: string;
  quantity: number;
  notes?: string | null;
  kitchenStatus: KitchenItemStatus;
  productionUnitId?: string | null;
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
};

export type DiningSessionUpdatedPayload = {
  companyId: string;
  branchId: string;
  salonId?: string | null;
  orderId: string;
  kind: DiningOrderKind;
  status: DiningOrderStatus;
  displayLabel: string;
  diningTableId?: string | null;
  items: DiningSessionLinePayload[];
};

type SubscribeAck = {
  ok?: boolean;
  error?: string;
  joined?: string;
};

const MAX_SUBSCRIBE_ATTEMPTS = 12;
const SUBSCRIBE_RETRY_MS = 100;

/**
 * Suscribe al namespace `/realtime/dining` room de sucursal para
 * `dining.session.updated` (cuentas POS: mesas, barra, takeaway).
 */
export function useDiningBranchRealtime(
  branchId: string,
  onSessionUpdated: (payload: DiningSessionUpdatedPayload) => void,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  const { data: session } = useSession();
  const userId = session?.user?.accessToken ?? null;
  const activeCompanyId =
    (session?.user as { activeCompanyId?: string | null })?.activeCompanyId ??
    null;

  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const authReadyRef = useRef(false);
  const branchIdRef = useRef(branchId);
  const subscribeAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdatedRef = useRef(onSessionUpdated);

  onUpdatedRef.current = onSessionUpdated;
  branchIdRef.current = branchId;

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const refreshSubscribe = useCallback(() => {
    const socket = socketRef.current;
    const bid = branchIdRef.current.trim();
    if (!socket?.connected || !authReadyRef.current || !bid) return;

    clearRetry();
    const attempt = subscribeAttemptRef.current;

    socket.timeout(5000).emit(
      "subscribeBranch",
      { branchId: bid },
      (err: Error | null, res: SubscribeAck | undefined) => {
        if (branchIdRef.current.trim() !== bid) return;

        if (!err && res?.ok) {
          subscribeAttemptRef.current = 0;
          setConnected(true);
          return;
        }

        setConnected(false);
        if (attempt + 1 >= MAX_SUBSCRIBE_ATTEMPTS) {
          console.warn(
            "[pos-dining-ws] subscribeBranch falló tras reintentos",
            err?.message ?? res?.error ?? "unknown",
          );
          return;
        }

        subscribeAttemptRef.current = attempt + 1;
        retryTimerRef.current = setTimeout(() => {
          refreshSubscribe();
        }, SUBSCRIBE_RETRY_MS * Math.min(8, attempt + 1));
      },
    );
  }, [clearRetry]);

  useEffect(() => {
    if (!enabled || !userId || !activeCompanyId || !branchId.trim()) {
      return;
    }

    const base = getClientBackendApiBase();
    if (!base) return;

    authReadyRef.current = false;
    subscribeAttemptRef.current = 0;
    setConnected(false);

    const socket: Socket = io(`${base}/realtime/dining`, {
      transports: ["websocket"],
      auth: {
        userId,
        activeCompanyId,
      },
    });
    socketRef.current = socket;

    const onReady = () => {
      authReadyRef.current = true;
      subscribeAttemptRef.current = 0;
      refreshSubscribe();
    };

    socket.on("connect", () => {
      setConnected(false);
      clearRetry();
      // Re-auth / re-join tras reconnect (incluye mark ready desde KDS).
      retryTimerRef.current = setTimeout(() => {
        if (!socket.connected) return;
        authReadyRef.current = true;
        subscribeAttemptRef.current = 0;
        refreshSubscribe();
      }, 120);
    });

    socket.on("dining.ready", onReady);

    socket.io.on("reconnect", () => {
      authReadyRef.current = true;
      subscribeAttemptRef.current = 0;
      refreshSubscribe();
    });

    socket.on("disconnect", () => {
      authReadyRef.current = false;
      subscribeAttemptRef.current = 0;
      clearRetry();
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[pos-dining-ws] connect_error", err.message);
      setConnected(false);
    });

    socket.on("auth_error", (payload) => {
      console.warn("[pos-dining-ws] auth_error", payload);
      setConnected(false);
    });

    socket.on("dining.session.updated", (payload: DiningSessionUpdatedPayload) => {
      onUpdatedRef.current(payload);
    });

    return () => {
      clearRetry();
      socket.off("dining.ready", onReady);
      socket.io.off("reconnect");
      socket.disconnect();
      socketRef.current = null;
      authReadyRef.current = false;
      setConnected(false);
    };
  }, [enabled, userId, activeCompanyId, branchId, refreshSubscribe, clearRetry]);

  useEffect(() => {
    subscribeAttemptRef.current = 0;
    setConnected(false);
    refreshSubscribe();
  }, [branchId, refreshSubscribe]);

  return { connected };
}
