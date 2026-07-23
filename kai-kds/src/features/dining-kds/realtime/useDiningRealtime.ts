"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getClientBackendApiBase } from "@/lib/backend-api";
import type {
  DiningKitchenItemUpdatedPayload,
  DiningKitchenSnapshotPayload,
} from "./dining-realtime.types";

type SubscribeAck = {
  ok?: boolean;
  error?: string;
  joined?: string;
  queueSize?: number;
};

type DiningRealtimeOptions = {
  userId: string;
  activeCompanyId: string;
  productionUnitId?: string | null;
  onKitchenItemUpdated?: (payload: DiningKitchenItemUpdatedPayload) => void;
  onKitchenSnapshot?: (payload: DiningKitchenSnapshotPayload) => void;
};

const MAX_SUBSCRIBE_ATTEMPTS = 8;
const SUBSCRIBE_RETRY_MS = 75;

export function useDiningRealtime({
  userId,
  activeCompanyId,
  productionUnitId,
  onKitchenItemUpdated,
  onKitchenSnapshot,
}: DiningRealtimeOptions) {
  /** True solo cuando el socket está auth y (si hay UP) el join al room OK. */
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const authReadyRef = useRef(false);
  const unitIdRef = useRef(productionUnitId);
  const subscribeAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callbacksRef = useRef({
    onKitchenItemUpdated,
    onKitchenSnapshot,
  });

  callbacksRef.current = {
    onKitchenItemUpdated,
    onKitchenSnapshot,
  };

  unitIdRef.current = productionUnitId;

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const refreshSubscribe = useCallback(() => {
    const socket = socketRef.current;
    const unitId = unitIdRef.current;
    if (!socket?.connected || !authReadyRef.current) return;

    if (!unitId) {
      setConnected(true);
      return;
    }

    clearRetry();
    const attempt = subscribeAttemptRef.current;

    socket.timeout(5000).emit(
      "subscribeKitchenUnit",
      { unitId },
      (err: Error | null, res: SubscribeAck | undefined) => {
        if (unitIdRef.current !== unitId) return;

        if (!err && res?.ok) {
          subscribeAttemptRef.current = 0;
          setConnected(true);
          return;
        }

        setConnected(false);
        if (attempt + 1 >= MAX_SUBSCRIBE_ATTEMPTS) {
          console.warn(
            "[kds-ws] subscribeKitchenUnit falló tras reintentos",
            err?.message ?? res?.error ?? "unknown",
          );
          return;
        }

        subscribeAttemptRef.current = attempt + 1;
        retryTimerRef.current = setTimeout(() => {
          refreshSubscribe();
        }, SUBSCRIBE_RETRY_MS * (attempt + 1));
      },
    );
  }, [clearRetry]);

  useEffect(() => {
    if (!userId || !activeCompanyId) return;

    authReadyRef.current = false;
    subscribeAttemptRef.current = 0;
    setConnected(false);

    let base: string;
    try {
      base = getClientBackendApiBase();
    } catch (e) {
      console.warn(
        "[kds-ws] backend URL ausente",
        e instanceof Error ? e.message : e,
      );
      return;
    }

    const socket = io(`${base}/realtime/dining`, {
      // polling primero: más tolerante; luego upgrade a websocket
      transports: ["polling", "websocket"],
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
      // Preferir dining.ready; si el server aún no lo emite, reintentar tras un beat.
      setConnected(false);
      clearRetry();
      retryTimerRef.current = setTimeout(() => {
        if (!socket.connected) return;
        if (!authReadyRef.current) {
          authReadyRef.current = true;
        }
        subscribeAttemptRef.current = 0;
        refreshSubscribe();
      }, 120);
    });

    socket.on("dining.ready", onReady);

    socket.on("disconnect", () => {
      authReadyRef.current = false;
      subscribeAttemptRef.current = 0;
      clearRetry();
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[kds-ws] connect_error", err.message, base);
      setConnected(false);
    });

    socket.on("auth_error", (payload) => {
      console.warn("[kds-ws] auth_error", payload);
      setConnected(false);
    });

    socket.on("dining.kitchen.item_updated", (payload: DiningKitchenItemUpdatedPayload) => {
      callbacksRef.current.onKitchenItemUpdated?.(payload);
    });
    socket.on("dining.kitchen.snapshot", (payload: DiningKitchenSnapshotPayload) => {
      callbacksRef.current.onKitchenSnapshot?.(payload);
    });

    return () => {
      clearRetry();
      socket.off("dining.ready", onReady);
      socket.disconnect();
      socketRef.current = null;
      authReadyRef.current = false;
      setConnected(false);
    };
  }, [userId, activeCompanyId, refreshSubscribe, clearRetry]);

  useEffect(() => {
    subscribeAttemptRef.current = 0;
    setConnected(false);
    refreshSubscribe();
  }, [productionUnitId, refreshSubscribe]);

  return { connected };
}
