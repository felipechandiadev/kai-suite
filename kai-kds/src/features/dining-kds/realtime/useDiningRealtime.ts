"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getClientBackendApiBase } from "@/lib/backend-api";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/kds-api-failure";
import { getKdsSocketTokenAction } from "../actions/kds.action";
import { playKdsAlertSound } from "../lib/play-kds-alert-sound";
import {
  initialKdsConnectionState,
  kdsReconnectDelayMs,
  reduceKdsConnection,
  type KdsConnectionEvent,
  type KdsConnectionStatus,
} from "./kds-connection-state";
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
  /** Solo clave de sesión para reiniciar el socket; NO es credencial (va un token ws firmado). */
  userId: string;
  activeCompanyId: string;
  productionUnitId?: string | null;
  onKitchenItemUpdated?: (payload: DiningKitchenItemUpdatedPayload) => void;
  onKitchenSnapshot?: (payload: DiningKitchenSnapshotPayload) => void;
};

const MAX_SUBSCRIBE_ATTEMPTS = 8;
const SUBSCRIBE_RETRY_MS = 75;
const STATUS_TICK_MS = 1000;

/** Alerta sonora: 2 toques al perder la conexión, 1 al recuperarla. */
function playConnectionAlert(kind: "lost" | "restored") {
  playKdsAlertSound();
  if (kind === "lost") setTimeout(() => playKdsAlertSound(), 700);
}

export function useDiningRealtime({
  userId,
  activeCompanyId,
  productionUnitId,
  onKitchenItemUpdated,
  onKitchenSnapshot,
}: DiningRealtimeOptions) {
  /** True solo cuando el socket está auth y (si hay UP) el join al room OK. */
  const [connected, setConnectedState] = useState(false);
  const [status, setStatus] = useState<KdsConnectionStatus>("connecting");
  const connStateRef = useRef(initialKdsConnectionState(Date.now()));
  const dispatchConn = useCallback((event: KdsConnectionEvent) => {
    const { state, alert } = reduceKdsConnection(connStateRef.current, event, Date.now());
    connStateRef.current = state;
    setStatus(state.status);
    if (alert) playConnectionAlert(alert);
  }, []);
  const setConnected = useCallback(
    (value: boolean) => {
      setConnectedState(value);
      dispatchConn({ type: value ? "connected" : "disconnected" });
    },
    [dispatchConn],
  );
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
  }, [clearRetry, setConnected]);

  // Reloj para pasar de "reconectando" a "sin conexión" aunque no lleguen eventos.
  useEffect(() => {
    const id = setInterval(() => dispatchConn({ type: "tick" }), STATUS_TICK_MS);
    return () => clearInterval(id);
  }, [dispatchConn]);

  useEffect(() => {
    if (!userId || !activeCompanyId) return;

    authReadyRef.current = false;
    subscribeAttemptRef.current = 0;
    dispatchConn({ type: "reset" });
    setConnectedState(false);

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

    let disposed = false;
    let manualRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let manualAttempt = 0;

    const socket = io(`${base}/realtime/dining`, {
      // polling primero: más tolerante; luego upgrade a websocket
      transports: ["polling", "websocket"],
      // Backoff exponencial con jitter de socket.io para caídas de red.
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      randomizationFactor: 0.5,
      // Se invoca en cada (re)conexión: pide un token ws fresco (~60s) al servidor Next,
      // que lo obtiene de kai-core con el access token de la cookie httpOnly.
      auth: (cb) => {
        void getKdsSocketTokenAction()
          .catch(() => ({ ok: false as const, reason: "error" as const }))
          .then((res) => {
            if (!res.ok && res.reason === "unauthorized") {
              redirectToLoginIfUnauthorized(new Error("No autenticado"));
            }
            cb({
              token: res.ok ? res.token : undefined,
              activeCompanyId,
            });
          });
      },
    });
    socketRef.current = socket;

    /**
     * Si el servidor corta (p. ej. token rechazado) socket.io no reintenta solo:
     * reintento manual con backoff exponencial + jitter.
     */
    const scheduleManualReconnect = () => {
      if (disposed || manualRetryTimer) return;
      const delay = kdsReconnectDelayMs(manualAttempt);
      manualAttempt += 1;
      manualRetryTimer = setTimeout(() => {
        manualRetryTimer = null;
        if (!disposed && !socket.connected) socket.connect();
      }, delay);
    };

    const onReady = () => {
      authReadyRef.current = true;
      subscribeAttemptRef.current = 0;
      refreshSubscribe();
    };

    socket.on("connect", () => {
      manualAttempt = 0;
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

    socket.on("disconnect", (reason) => {
      authReadyRef.current = false;
      subscribeAttemptRef.current = 0;
      clearRetry();
      setConnected(false);
      if (reason === "io server disconnect") scheduleManualReconnect();
    });

    socket.on("connect_error", (err) => {
      console.warn("[kds-ws] connect_error", err.message, base);
      setConnected(false);
      // socket.io reintenta solo salvo que el middleware lo haya rechazado.
      if (!socket.active) scheduleManualReconnect();
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
      disposed = true;
      if (manualRetryTimer) clearTimeout(manualRetryTimer);
      clearRetry();
      socket.off("dining.ready", onReady);
      socket.disconnect();
      socketRef.current = null;
      authReadyRef.current = false;
      setConnectedState(false);
    };
  }, [userId, activeCompanyId, refreshSubscribe, clearRetry, setConnected, dispatchConn]);

  useEffect(() => {
    subscribeAttemptRef.current = 0;
    // Cambio de unidad: no es una caída de red; solo re-suscribe.
    setConnectedState(false);
    refreshSubscribe();
  }, [productionUnitId, refreshSubscribe]);

  return { connected, status };
}
