"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { IconButton } from "@kai/ui";
import { useNotificationsRealtime } from "../realtime/notifications-realtime-context";
import { labelNotificationKind } from "../lib/notification-labels";
import { formatReceivedAt } from "@/features/inventory-stock/lib/stock-alert-copy";
import type { NotificationRow } from "../lib/inbox-mapper";

function formatQty(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);
}

function NotificationRowContent({ evt }: { evt: NotificationRow }) {
  const isEshop = evt.kind.startsWith("eshop.order.");
  return (
    <>
      <p className="text-xs font-medium text-muted-foreground">
        {formatReceivedAt(evt.receivedAt)}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {isEshop ? evt.title : evt.productName}
      </p>
      {evt.attributesLabel && isEshop ? (
        <p className="mt-0.5 text-xs text-muted-foreground">#{evt.attributesLabel}</p>
      ) : evt.attributesLabel ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{evt.attributesLabel}</p>
      ) : null}
      {evt.storageName ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Almacén: <span className="text-foreground">{evt.storageName}</span>
        </p>
      ) : null}
      {evt.body ? (
        <p className="mt-1 text-xs text-foreground/90">{evt.body}</p>
      ) : !isEshop ? (
        <p className="mt-1 text-xs text-foreground/90">
          Stock físico <strong>{formatQty(evt.physicalStock)}</strong>
        </p>
      ) : null}
      {!isEshop ? (
        <ul className="mt-1.5 space-y-0.5 text-xs text-amber-800 dark:text-amber-200">
          {evt.alertLabels.map((a) => (
            <li key={a} className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              <span>{labelNotificationKind(a)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function NotificationsDropdown() {
  const { unreadCount, notificationRows, clearNotifications, refreshNotifications } =
    useNotificationsRealtime();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void refreshNotifications();
  }, [open, refreshNotifications]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative z-[100] shrink-0" ref={rootRef} data-test-id="notifications-dropdown-root">
      <div className="relative inline-flex shrink-0">
        <IconButton
          icon="Bell"
          variant="text"
          size="md"
          strokeWidth={2.5}
          ariaLabel={`Notificaciones${unreadCount > 0 ? `: ${unreadCount} sin leer` : ""}`}
          title="Notificaciones"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          data-test-id="notifications-trigger"
        />
        {unreadCount > 0 ? (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </div>
      {open ? (
        <div
          className="absolute right-0 z-[110] mt-1 flex max-h-[min(24rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-border bg-background text-foreground shadow-lg"
          role="dialog"
          aria-label="Notificaciones"
          data-test-id="notifications-popover"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <span className="text-sm font-semibold tracking-tight">Notificaciones</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {notificationRows.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Sin notificaciones recientes. Las alertas de stock aparecerán aquí en tiempo real.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {notificationRows.map((evt) => (
                  <li key={evt.deliveryId} className="px-3 py-2.5">
                    {evt.href ? (
                      <a href={evt.href} className="block hover:bg-muted/50 -mx-1 px-1 rounded">
                        <NotificationRowContent evt={evt} />
                      </a>
                    ) : (
                      <NotificationRowContent evt={evt} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {notificationRows.length > 0 ? (
            <div className="border-t border-border bg-muted/30 px-2 py-2">
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-center text-sm font-medium hover:bg-muted"
                onClick={() => {
                  void clearNotifications();
                  setOpen(false);
                }}
                data-test-id="notifications-mark-read"
              >
                Marcar todas como leídas
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
