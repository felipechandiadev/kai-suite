"use client";

import { useCallback, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

function wsBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return base.replace(/\/$/, "");
}

type DiningRealtimeOptions = {
  userId: string;
  activeCompanyId: string;
  salonId?: string | null;
  productionUnitId?: string | null;
  onSessionUpdated?: (payload: unknown) => void;
  onKitchenItemUpdated?: (payload: unknown) => void;
  onKitchenSnapshot?: (payload: unknown) => void;
};

export function useDiningRealtime({
  userId,
  activeCompanyId,
  salonId,
  productionUnitId,
  onSessionUpdated,
  onKitchenItemUpdated,
  onKitchenSnapshot,
}: DiningRealtimeOptions) {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({
    onSessionUpdated,
    onKitchenItemUpdated,
    onKitchenSnapshot,
  });

  callbacksRef.current = {
    onSessionUpdated,
    onKitchenItemUpdated,
    onKitchenSnapshot,
  };

  const refreshSubscribe = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (salonId) {
      socket.emit("subscribeSalon", { salonId, branchId: null });
    }
    if (productionUnitId) {
      socket.emit("subscribeKitchenUnit", { productionUnitId });
    }
  }, [salonId, productionUnitId]);

  useEffect(() => {
    if (!userId || !activeCompanyId) return;

    const socket = io(`${wsBaseUrl()}/realtime/dining`, {
      transports: ["websocket"],
      auth: {
        userId,
        activeCompanyId,
      },
    });
    socketRef.current = socket;

    socket.on("connect", () => refreshSubscribe());
    socket.on("dining.session.updated", (payload) => {
      callbacksRef.current.onSessionUpdated?.(payload);
    });
    socket.on("dining.kitchen.item_updated", (payload) => {
      callbacksRef.current.onKitchenItemUpdated?.(payload);
    });
    socket.on("dining.kitchen.snapshot", (payload) => {
      callbacksRef.current.onKitchenSnapshot?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, activeCompanyId, refreshSubscribe]);

  useEffect(() => {
    refreshSubscribe();
  }, [refreshSubscribe]);
}
