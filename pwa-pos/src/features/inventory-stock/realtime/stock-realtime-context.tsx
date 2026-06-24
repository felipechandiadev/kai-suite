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
import { io, type Socket } from "socket.io-client";
import { getClientBackendApiBase } from "@/lib/backend-api-url";
import {
  fetchInbox,
  fetchUnreadCount,
  markAllNotificationsRead,
} from "@/features/notifications/infrastructure/notifications.request";
import {
  inboxItemToRow,
  type NotificationRow,
} from "@/features/notifications/lib/inbox-mapper";
import type { NotificationDeliveryWsPayload } from "@/features/notifications/types/notification.types";

export type { NotificationRow };

type StockRealtimeContextValue = {
  stockAlertCount: number;
  notificationRows: NotificationRow[];
  clearStockAlerts: () => Promise<void>;
  refreshStockAlerts: () => Promise<void>;
};

const StockRealtimeContext = createContext<StockRealtimeContextValue>({
  stockAlertCount: 0,
  notificationRows: [],
  clearStockAlerts: async () => {},
  refreshStockAlerts: async () => {},
});

export function useStockRealtime() {
  return useContext(StockRealtimeContext);
}

function wsPayloadToRow(payload: NotificationDeliveryWsPayload): NotificationRow | null {
  return inboxItemToRow(
    {
      deliveryId: payload.deliveryId,
      status: payload.status,
      deliveredAt: payload.deliveredAt,
      readAt: null,
      notification: payload.notification,
    },
    "STOCK",
  );
}

export function PosStockRealtimeProvider({
  children,
  userId,
  activeCompanyId,
}: {
  children: React.ReactNode;
  /** Mismo esquema que el backend: `Bearer` = id de usuario (ver sesión POS). */
  userId: string | null;
  activeCompanyId?: string | null;
}) {
  const [stockAlertCount, setStockAlertCount] = useState(0);
  const [notificationRows, setNotificationRows] = useState<NotificationRow[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const refreshStockAlerts = useCallback(async () => {
    if (!userId) {
      setStockAlertCount(0);
      setNotificationRows([]);
      return;
    }
    try {
      const [count, inbox] = await Promise.all([
        fetchUnreadCount(userId, activeCompanyId, "STOCK"),
        fetchInbox(userId, activeCompanyId, {
          domain: "STOCK",
          status: "UNREAD",
          limit: 50,
        }),
      ]);
      setStockAlertCount(count);
      const rows = inbox
        .map((item) => inboxItemToRow(item, "STOCK"))
        .filter((x): x is NotificationRow => x != null);
      setNotificationRows(rows);
    } catch {
      setStockAlertCount(0);
      setNotificationRows([]);
    }
  }, [userId, activeCompanyId]);

  const clearStockAlerts = useCallback(async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId, activeCompanyId, "STOCK");
    setStockAlertCount(0);
    setNotificationRows([]);
  }, [userId, activeCompanyId]);

  useEffect(() => {
    if (!userId) return;
    void refreshStockAlerts();
  }, [userId, activeCompanyId, refreshStockAlerts]);

  useEffect(() => {
    const base = getClientBackendApiBase();
    if (!base || !userId) {
      return;
    }

    const socket = io(`${base}/realtime/notifications`, {
      transports: ["websocket"],
      auth: {
        userId,
        activeCompanyId: activeCompanyId ?? null,
      },
    });
    socketRef.current = socket;

    const onDelivery = (payload: NotificationDeliveryWsPayload) => {
      if (payload.notification.domain !== "STOCK") return;
      if (payload.status !== "UNREAD") return;

      const row = wsPayloadToRow(payload);
      if (row) {
        setNotificationRows((prev) => {
          const hadUnread = prev.some((p) => p.deliveryId === row.deliveryId);
          const next = [row, ...prev.filter((p) => p.deliveryId !== row.deliveryId)].slice(0, 50);
          if (!hadUnread) {
            setStockAlertCount((c) => c + 1);
          }
          return next;
        });
      }
    };

    socket.on("notification:delivery", onDelivery);

    return () => {
      socket.off("notification:delivery", onDelivery);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, activeCompanyId]);

  const value = useMemo(
    () => ({
      stockAlertCount,
      notificationRows,
      clearStockAlerts,
      refreshStockAlerts,
    }),
    [stockAlertCount, notificationRows, clearStockAlerts, refreshStockAlerts],
  );

  return <StockRealtimeContext.Provider value={value}>{children}</StockRealtimeContext.Provider>;
}
