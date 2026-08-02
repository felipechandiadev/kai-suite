"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { io, type Socket } from "socket.io-client";
import type { WaiterSession } from "@/lib/app-session";
import {
  fetchWaiterDiningInbox,
  fetchWaiterUnreadCount,
  markWaiterNotificationRead,
} from "../infrastructure/notifications.request";
import { playWaiterAlertSound, unlockWaiterAlertAudio } from "../lib/play-waiter-alert-sound";
import { waiterInboxItemToRow } from "../lib/inbox-mapper";
import type {
  WaiterNotificationDeliveryWsPayload,
  WaiterNotificationRow,
} from "../types/notification.types";
import { getClientBackendApiBase } from "@/lib/backend-api";

function formatReceivedAt(ts: number): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

type Props = {
  session: WaiterSession;
};

export function WaiterNotificationsBell({ session }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WaiterNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const connectErrorLoggedRef = useRef(false);

  const refresh = useCallback(async (opts?: { playIfNew?: boolean }) => {
    const [list, count] = await Promise.all([
      fetchWaiterDiningInbox(session.userId, session.companyId),
      fetchWaiterUnreadCount(session.userId, session.companyId),
    ]);
    if (opts?.playIfNew) {
      const prev = knownIdsRef.current;
      const hasNew = list.some((r) => !prev.has(r.deliveryId));
      if (hasNew && prev.size > 0) {
        playWaiterAlertSound();
      }
    }
    knownIdsRef.current = new Set(list.map((r) => r.deliveryId));
    setRows(list);
    setUnread(count);
  }, [session.userId, session.companyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Fallback si el WS se cae o el tab estuvo en background.
  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh({ playIfNew: true });
    }, 12_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => {
      void refresh({ playIfNew: true });
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refresh({ playIfNew: true });
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  useEffect(() => {
    let base = "";
    try {
      base = getClientBackendApiBase();
    } catch {
      console.warn(
        "[waiter-notifications] WS omitido: NEXT_PUBLIC_BACKEND_API_URL no definida",
      );
      return;
    }
    if (!base || !session.userId || !session.companyId) return;

    connectErrorLoggedRef.current = false;
    let socket: Socket | null = null;
    try {
      // polling primero: el upgrade websocket falla a menudo con localhost↔127.0.0.1 / LAN.
      socket = io(`${base}/realtime/notifications`, {
        transports: ["polling", "websocket"],
        auth: {
          userId: session.userId,
          activeCompanyId: session.companyId,
          companyId: session.companyId,
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1500,
      });
      socket.on("connect", () => {
        connectErrorLoggedRef.current = false;
      });
      socket.on("connect_error", (err) => {
        if (connectErrorLoggedRef.current) return;
        connectErrorLoggedRef.current = true;
        console.warn(
          `[waiter-notifications] WS connect_error (${base}): ${err.message}`,
        );
      });
      socket.on("auth_error", (payload) => {
        console.warn("[waiter-notifications] WS auth_error", payload);
      });
      socket.on("notification:delivery", (payload: WaiterNotificationDeliveryWsPayload) => {
        if (payload.companyId !== session.companyId) return;
        if (payload.userId !== session.userId) return;
        const kind = payload.notification?.kind ?? "";
        if (!kind.startsWith("dining.")) return;
        playWaiterAlertSound();
        const fakeItem = {
          deliveryId: payload.deliveryId,
          status: payload.status,
          deliveredAt: payload.deliveredAt,
          readAt: null,
          notification: payload.notification,
        };
        const row = waiterInboxItemToRow(fakeItem);
        if (row) {
          knownIdsRef.current.add(row.deliveryId);
          setRows((prev) => {
            if (prev.some((r) => r.deliveryId === row.deliveryId)) return prev;
            return [row, ...prev].slice(0, 40);
          });
          setUnread((c) => c + 1);
        } else {
          void refresh();
        }
      });
    } catch (err) {
      console.warn("[waiter-notifications] WS init failed", err);
    }
    return () => {
      socket?.disconnect();
    };
  }, [session.userId, session.companyId, refresh]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const openOrder = async (row: WaiterNotificationRow) => {
    setMarkingId(row.deliveryId);
    try {
      await markWaiterNotificationRead(
        session.userId,
        session.companyId,
        row.deliveryId,
      );
      knownIdsRef.current.delete(row.deliveryId);
      setRows((prev) => prev.filter((r) => r.deliveryId !== row.deliveryId));
      setUnread((c) => Math.max(0, c - 1));
      if (row.orderId) {
        const q = new URLSearchParams();
        q.set("orderId", row.orderId);
        if (row.kitchenFireId) q.set("fireId", row.kitchenFireId);
        if (row.diningTableId) q.set("tableId", row.diningTableId);
        router.push(`/salon?${q.toString()}`);
        setOpen(false);
      }
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="relative" ref={rootRef} data-test-id="waiter-notifications-bell">
      <IconButton
        icon="Bell"
        variant="action"
        size="md"
        ariaLabel={
          unread > 0
            ? `Notificaciones, ${unread} sin leer`
            : "Notificaciones"
        }
        onClick={() => {
          unlockWaiterAlertAudio();
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        data-test-id="waiter-notifications-button"
      />
      {unread > 0 ? (
        <span
          className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-warning-foreground"
          data-test-id="waiter-notifications-badge"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
      {open ? (
        <div
          className="absolute right-0 z-50 mt-1 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          data-test-id="waiter-notifications-panel"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-semibold text-foreground">Cocina lista</p>
            <p className="text-[11px] text-muted-foreground">
              Pedidos listos para llevar a mesa
            </p>
          </div>
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Sin alertas nuevas
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {rows.map((row) => (
                <li
                  key={row.deliveryId}
                  className="border-b border-border last:border-b-0"
                >
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left hover:bg-muted/40 disabled:opacity-50"
                    disabled={markingId === row.deliveryId}
                    onClick={() => void openOrder(row)}
                    data-test-id={`waiter-notification-${row.deliveryId}`}
                  >
                    <p className="text-[11px] text-muted-foreground">
                      {formatReceivedAt(row.receivedAt)}
                      {row.kitchenFireNumber != null
                        ? ` · Pedido #${row.kitchenFireNumber}`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {row.title}
                    </p>
                    {row.diningItems && row.diningItems.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-foreground/90">
                        {row.diningItems.map((it, idx) => (
                          <li key={`${it.name}-${idx}`}>
                            {it.quantity}× {it.name}
                            {it.notes ? ` · ${it.notes}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : row.body ? (
                      <p className="mt-1 whitespace-pre-line text-xs text-foreground/90">
                        {row.body}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
