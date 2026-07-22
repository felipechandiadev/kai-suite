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
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/infrastructure/notifications.request";
import {
  inboxItemToRow,
  type NotificationRow,
} from "@/features/notifications/lib/inbox-mapper";
import type { NotificationDeliveryWsPayload } from "@/features/notifications/types/notification.types";
import {
  playPosAlertSound,
  unlockPosAlertAudio,
} from "@/features/notifications/lib/play-pos-alert-sound";
import { ensurePosWebPushSubscription } from "@/features/notifications/lib/web-push-subscribe";

export type { NotificationRow };

const POS_ALERT_DOMAINS = ["STOCK", "CATALOG", "SALES"] as const;
type PosAlertDomain = (typeof POS_ALERT_DOMAINS)[number];

function isPosAlertDomain(domain: string): domain is PosAlertDomain {
  return (POS_ALERT_DOMAINS as readonly string[]).includes(domain);
}

type StockRealtimeContextValue = {
  stockAlertCount: number;
  notificationRows: NotificationRow[];
  clearStockAlerts: () => Promise<void>;
  markStockAlertRead: (deliveryId: string) => Promise<void>;
  refreshStockAlerts: () => Promise<void>;
};

const StockRealtimeContext = createContext<StockRealtimeContextValue>({
  stockAlertCount: 0,
  notificationRows: [],
  clearStockAlerts: async () => {},
  markStockAlertRead: async () => {},
  refreshStockAlerts: async () => {},
});

export function useStockRealtime() {
  return useContext(StockRealtimeContext);
}

function wsPayloadToRow(payload: NotificationDeliveryWsPayload): NotificationRow | null {
  const domain = payload.notification?.domain;
  if (!domain || !isPosAlertDomain(domain)) return null;
  return inboxItemToRow(
    {
      deliveryId: payload.deliveryId,
      status: payload.status,
      deliveredAt: payload.deliveredAt,
      readAt: null,
      notification: payload.notification,
    },
    domain,
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
      const [stockInbox, catalogInbox, salesInbox] = await Promise.all([
        fetchInbox(userId, activeCompanyId, {
          domain: "STOCK",
          status: "UNREAD",
          limit: 50,
        }),
        fetchInbox(userId, activeCompanyId, {
          domain: "CATALOG",
          status: "UNREAD",
          limit: 50,
        }),
        fetchInbox(userId, activeCompanyId, {
          domain: "SALES",
          status: "UNREAD",
          limit: 50,
        }),
      ]);
      const rows = [
        ...stockInbox.map((item) => inboxItemToRow(item, "STOCK")),
        ...catalogInbox.map((item) => inboxItemToRow(item, "CATALOG")),
        ...salesInbox.map((item) => inboxItemToRow(item, "SALES")),
      ]
        .filter((x): x is NotificationRow => x != null)
        .sort((a, b) => b.receivedAt - a.receivedAt)
        .slice(0, 50);
      setNotificationRows(rows);
      setStockAlertCount(rows.length);
    } catch {
      setStockAlertCount(0);
      setNotificationRows([]);
    }
  }, [userId, activeCompanyId]);

  const clearStockAlerts = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      markAllNotificationsRead(userId, activeCompanyId, "STOCK"),
      markAllNotificationsRead(userId, activeCompanyId, "CATALOG"),
      markAllNotificationsRead(userId, activeCompanyId, "SALES"),
    ]);
    setStockAlertCount(0);
    setNotificationRows([]);
  }, [userId, activeCompanyId]);

  const markStockAlertRead = useCallback(
    async (deliveryId: string) => {
      if (!userId || !deliveryId) return;
      let snapshot: NotificationRow[] = [];
      setNotificationRows((prev) => {
        snapshot = prev;
        const next = prev.filter((r) => r.deliveryId !== deliveryId);
        setStockAlertCount(next.length);
        return next;
      });
      const ok = await markNotificationRead(userId, activeCompanyId, deliveryId);
      if (!ok) {
        setNotificationRows(snapshot);
        setStockAlertCount(snapshot.length);
      }
    },
    [userId, activeCompanyId],
  );

  useEffect(() => {
    if (!userId) return;
    void refreshStockAlerts();
  }, [userId, activeCompanyId, refreshStockAlerts]);

  /** Desbloquea AudioContext + intenta Web Push tras el primer gesto. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const unlock = () => {
      unlockPosAlertAudio();
      if (userId) {
        void ensurePosWebPushSubscription({
          userId,
          activeCompanyId,
        });
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, [userId, activeCompanyId]);

  /** Web Push al montar (si el permiso ya estaba granted). */
  useEffect(() => {
    if (!userId) return;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      void ensurePosWebPushSubscription({
        userId,
        activeCompanyId,
      });
    }
  }, [userId, activeCompanyId]);

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
      if (payload.status !== "UNREAD") return;

      // Cualquier alerta que llegue al POS (stock, precios, cocina, etc.)
      playPosAlertSound();

      const domain = payload.notification.domain;
      if (!isPosAlertDomain(domain)) return;

      const row = wsPayloadToRow(payload);
      if (row) {
        setNotificationRows((prev) => {
          const next = [row, ...prev.filter((p) => p.deliveryId !== row.deliveryId)].slice(
            0,
            50,
          );
          setStockAlertCount(next.length);
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
      markStockAlertRead,
      refreshStockAlerts,
    }),
    [
      stockAlertCount,
      notificationRows,
      clearStockAlerts,
      markStockAlertRead,
      refreshStockAlerts,
    ],
  );

  return <StockRealtimeContext.Provider value={value}>{children}</StockRealtimeContext.Provider>;
}
