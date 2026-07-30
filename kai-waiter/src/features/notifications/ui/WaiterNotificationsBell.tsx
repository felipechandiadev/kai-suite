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

  const refresh = useCallback(async () => {
    const [list, count] = await Promise.all([
      fetchWaiterDiningInbox(session.userId, session.companyId),
      fetchWaiterUnreadCount(session.userId, session.companyId),
    ]);
    setRows(list);
    setUnread(count);
  }, [session.userId, session.companyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ?? "";
    if (!base) return;
    let socket: Socket | null = null;
    try {
      socket = io(`${base.replace(/\/$/, "")}/realtime/notifications`, {
        transports: ["websocket", "polling"],
        auth: {
          userId: session.userId,
          companyId: session.companyId,
        },
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
          setRows((prev) => {
            if (prev.some((r) => r.deliveryId === row.deliveryId)) return prev;
            return [row, ...prev].slice(0, 40);
          });
          setUnread((c) => c + 1);
        } else {
          void refresh();
        }
      });
    } catch {
      // ignore
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
              Pedidos que enviaste y ya están listos
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
