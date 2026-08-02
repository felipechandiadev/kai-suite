"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { getClientBackendApiBase } from "@/lib/backend-api";

type DiningRealtimeOptions = {
  userId: string;
  activeCompanyId: string;
  branchId?: string | null;
  salonId?: string | null;
  /** Mesas abiertas por este mesero (rooms de mensajería por mesa). */
  openTableIds?: string[];
  productionUnitId?: string | null;
  onSessionUpdated?: (payload: unknown) => void;
  onKitchenItemUpdated?: (payload: unknown) => void;
  onKitchenSnapshot?: (payload: unknown) => void;
};

export function useDiningRealtime({
  userId,
  activeCompanyId,
  branchId,
  salonId,
  openTableIds,
  productionUnitId,
  onSessionUpdated,
  onKitchenItemUpdated,
  onKitchenSnapshot,
}: DiningRealtimeOptions) {
  const socketRef = useRef<Socket | null>(null);
  const authReadyRef = useRef(false);
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

  const tableIdsKey = useMemo(() => {
    const ids = (openTableIds ?? [])
      .map((id) => id.trim())
      .filter(Boolean);
    return [...new Set(ids)].sort().join(",");
  }, [openTableIds]);

  const refreshSubscribe = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !authReadyRef.current) return;

    const bid = branchId?.trim();
    const sid = salonId?.trim();
    if (bid && sid) {
      socket.emit("subscribeSalon", { salonId: sid, branchId: bid });
    }

    const tableIds = tableIdsKey ? tableIdsKey.split(",") : [];
    socket.emit("subscribeTables", { tableIds });

    if (productionUnitId) {
      socket.emit("subscribeKitchenUnit", { productionUnitId });
    }
  }, [branchId, salonId, tableIdsKey, productionUnitId]);

  useEffect(() => {
    if (!userId || !activeCompanyId) return;

    let base = "";
    try {
      base = getClientBackendApiBase();
    } catch {
      return;
    }

    authReadyRef.current = false;
    const socket = io(`${base}/realtime/dining`, {
      transports: ["polling", "websocket"],
      auth: {
        userId,
        activeCompanyId,
      },
    });
    socketRef.current = socket;

    socket.on("dining.ready", () => {
      authReadyRef.current = true;
      refreshSubscribe();
    });
    socket.on("connect", () => {
      if (authReadyRef.current) refreshSubscribe();
    });
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
      authReadyRef.current = false;
    };
  }, [userId, activeCompanyId, refreshSubscribe]);

  useEffect(() => {
    refreshSubscribe();
  }, [refreshSubscribe]);
}
