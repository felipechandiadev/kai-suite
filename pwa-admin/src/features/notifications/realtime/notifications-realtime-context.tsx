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

import {
  fetchInbox,
  fetchUnreadCount,
  markAllNotificationsRead,
} from "../infrastructure/notifications.request";
import { inboxItemToRow, type NotificationRow } from "../lib/inbox-mapper";
import type { NotificationDeliveryWsPayload } from "../types/notification.types";
import { isUnauthorizedResponse, signOutSessionExpired } from "@/lib/auth/sign-out-session-expired";

type NotificationsRealtimeContextValue = {
  unreadCount: number;
  notificationRows: NotificationRow[];
  stockRefreshToken: number;
  refreshNotifications: () => Promise<void>;
  clearNotifications: () => Promise<void>;
};

const NotificationsRealtimeContext = createContext<NotificationsRealtimeContextValue>({
  unreadCount: 0,
  notificationRows: [],
  stockRefreshToken: 0,
  refreshNotifications: async () => {},
  clearNotifications: async () => {},
});

export function useNotificationsRealtime() {
  return useContext(NotificationsRealtimeContext);
}

function clientBackendBaseUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.replace(/\/$/, ""));
    if (typeof window !== "undefined") {
      const host = url.hostname.toLowerCase();
      const loopback =
        host === "localhost" || host === "127.0.0.1" || host === "::1";
      if (loopback) {
        url.hostname = window.location.hostname;
      }
    }
    return url.origin;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function wsPayloadToRow(payload: NotificationDeliveryWsPayload): NotificationRow | null {
  const domain = payload.notification.domain;
  const domainFilter = domain === "STOCK" ? "STOCK" : domain === "SALES" ? undefined : "STOCK";
  if (domain !== "STOCK" && domain !== "SALES") return null;
  return inboxItemToRow(
    {
      deliveryId: payload.deliveryId,
      status: payload.status,
      deliveredAt: payload.deliveredAt,
      readAt: null,
      notification: payload.notification,
    },
    domainFilter,
  );
}

export function NotificationsRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationRows, setNotificationRows] = useState<NotificationRow[]>([]);
  const [stockRefreshToken, setStockRefreshToken] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const activeCompanyId =
    (session?.user as { activeCompanyId?: string | null })?.activeCompanyId ?? null;
  const token = session?.user?.accessToken;

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    const [countResult, inboxResult] = await Promise.allSettled([
      fetchUnreadCount(token, activeCompanyId),
      fetchInbox(token, activeCompanyId, {
        status: "UNREAD",
        limit: 50,
      }),
    ]);

    if (countResult.status === "fulfilled") {
      setUnreadCount(countResult.value);
    }

    if (inboxResult.status === "fulfilled") {
      const rows = inboxResult.value
        .filter((item) => item.status === "UNREAD")
        .map((item) => inboxItemToRow(item))
        .filter((x): x is NotificationRow => x != null);
      setNotificationRows(rows);
    }
  }, [token, activeCompanyId]);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    let cancelled = false;
    void (async () => {
      try {
        await refreshNotifications();
        if (cancelled) return;
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, token, activeCompanyId, refreshNotifications]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const base = clientBackendBaseUrl();
    if (!base || !token) return;

    const socket = io(`${base}/realtime/notifications`, {
      transports: ["polling", "websocket"],
      auth: {
        userId: token,
        activeCompanyId,
      },
    });
    socketRef.current = socket;

    const onDelivery = (payload: NotificationDeliveryWsPayload) => {
      const domain = payload.notification.domain;
      if (domain !== "STOCK" && domain !== "SALES") return;
      if (payload.status !== "UNREAD") return;

      const row = wsPayloadToRow(payload);
      if (row) {
        setNotificationRows((prev) => {
          const hadUnread = prev.some((p) => p.deliveryId === row.deliveryId);
          const next = [row, ...prev.filter((p) => p.deliveryId !== row.deliveryId)].slice(0, 50);
          if (!hadUnread) {
            setUnreadCount((c) => c + 1);
          }
          return next;
        });
      }
      if (domain === "STOCK") {
        setStockRefreshToken((n) => n + 1);
      }
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

    socket.on("notification:delivery", onDelivery);
    socket.on("auth_error", onAuthError);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("notification:delivery", onDelivery);
      socket.off("auth_error", onAuthError);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [status, token, activeCompanyId]);

  const clearNotifications = useCallback(async () => {
    if (!token) return;
    await markAllNotificationsRead(token, activeCompanyId);
    setUnreadCount(0);
    setNotificationRows([]);
  }, [token, activeCompanyId]);

  const value = useMemo(
    () => ({
      unreadCount,
      notificationRows,
      stockRefreshToken,
      refreshNotifications,
      clearNotifications,
    }),
    [unreadCount, notificationRows, stockRefreshToken, refreshNotifications, clearNotifications],
  );

  return (
    <NotificationsRealtimeContext.Provider value={value}>
      {children}
    </NotificationsRealtimeContext.Provider>
  );
}
