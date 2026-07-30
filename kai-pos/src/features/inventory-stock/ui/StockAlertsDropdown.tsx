"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { IconButton } from "@kai/ui";
import { formatReceivedAt } from "../lib/stock-alert-copy";
import { labelNotificationKind } from "@/features/notifications/lib/notification-labels";
import { useStockRealtime } from "../realtime/stock-realtime-context";
import { PosTopBarCountBadge } from "@/shared/components/PosTopBar/PosTopBarCountBadge";

const PANEL_Z = 200;

function formatQty(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);
}

export function StockAlertsDropdown() {
  const {
    stockAlertCount,
    notificationRows,
    clearStockAlerts,
    markStockAlertRead,
    refreshStockAlerts,
  } = useStockRealtime();
  const [open, setOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    void refreshStockAlerts();
  }, [open, refreshStockAlerts]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const el = triggerWrapRef.current;
    if (!el) return;

    const place = () => {
      const r = el.getBoundingClientRect();
      const maxW = Math.min(22 * 16, window.innerWidth - 16);
      const left = Math.max(8, r.right - maxW);
      const top = r.bottom + 4;
      setCoords({ top, left, width: maxW });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (triggerWrapRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const panelStyle = {
    backgroundColor: "var(--color-background)",
    borderColor: "var(--color-border)",
    color: "var(--color-foreground)",
    zIndex: PANEL_Z,
  } as const;

  const panel =
    open && coords ? (
      <div
        ref={panelRef}
        className="fixed flex max-h-[min(24rem,70vh)] flex-col overflow-hidden rounded-md border shadow-lg"
        style={{
          ...panelStyle,
          top: coords.top,
          left: coords.left,
          width: coords.width,
        }}
        role="dialog"
        aria-label="Alertas"
        data-test-id="stock-alerts-popover"
      >
        <div
          className="flex items-center gap-2 border-b px-3 py-2.5"
          style={{ borderColor: "var(--color-border)" }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">Alertas</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {notificationRows.length === 0 ? (
            <p
              className="px-3 py-8 text-center text-sm"
              style={{ color: "var(--color-muted-foreground, #737373)" }}
            >
              Sin alertas recientes.
            </p>
          ) : (
            <ul>
              {notificationRows.map((evt) => {
                const isPricing = evt.kind.startsWith("pricing.");
                const isDiningReady =
                  evt.kind === "dining.kitchen.ready" ||
                  evt.kind === "dining.kitchen.item_ready" ||
                  evt.kind === "dining.kitchen.order_ready" ||
                  evt.kind.startsWith("dining.");
                const useTitle = isPricing || isDiningReady;
                const diningItems = evt.diningItems;
                return (
                <li
                  key={evt.deliveryId}
                  className="border-b px-3 py-2.5 last:border-b-0"
                  style={{ borderColor: "var(--color-border)" }}
                  data-test-id={
                    isDiningReady
                      ? `dining-ready-alert-${evt.deliveryId}`
                      : undefined
                  }
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground, #737373)" }}>
                        {formatReceivedAt(evt.receivedAt)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {useTitle ? evt.title : evt.productName}
                      </p>
                      {!useTitle && evt.attributesLabel ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{evt.attributesLabel}</p>
                      ) : null}
                      {!useTitle && evt.storageName ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Almacén: <span className="text-foreground">{evt.storageName}</span>
                        </p>
                      ) : null}
                      {isDiningReady && diningItems && diningItems.length > 0 ? (
                        <ul className="mt-1.5 space-y-0.5 text-xs text-foreground/90">
                          {diningItems.map((it, idx) => (
                            <li key={`${it.name}-${idx}`}>
                              {Number.isInteger(it.quantity)
                                ? it.quantity
                                : Math.round(it.quantity * 1000) / 1000}
                              × {it.name}
                              {it.notes ? ` · ${it.notes}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : evt.body ? (
                        <p className="mt-1 whitespace-pre-line text-xs text-foreground/90">{evt.body}</p>
                      ) : !useTitle ? (
                        <p className="mt-1 text-xs text-foreground/90">
                          Stock físico <strong>{formatQty(evt.physicalStock)}</strong>
                        </p>
                      ) : null}
                      <ul className="mt-1.5 space-y-0.5 text-xs text-amber-800 dark:text-amber-200">
                        {evt.alertLabels.map((a) => (
                          <li key={a} className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                            <span>{labelNotificationKind(useTitle ? evt.kind : a)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <IconButton
                      icon="Check"
                      variant="text"
                      size="sm"
                      className="shrink-0"
                      disabled={markingId === evt.deliveryId}
                      ariaLabel="Marcar como leída"
                      title="Marcar como leída"
                      data-test-id={`stock-alert-mark-read-${evt.deliveryId}`}
                      onClick={() => {
                        setMarkingId(evt.deliveryId);
                        void markStockAlertRead(evt.deliveryId).finally(() => {
                          setMarkingId((cur) =>
                            cur === evt.deliveryId ? null : cur,
                          );
                        });
                      }}
                    />
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
        {notificationRows.length > 0 ? (
          <div
            className="border-t px-2 py-2"
            style={{ borderColor: "var(--color-border)", backgroundColor: "rgba(0,0,0,0.03)" }}
          >
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-center text-sm font-medium"
              style={{ color: "var(--color-foreground)" }}
              onClick={() => {
                void clearStockAlerts();
                setOpen(false);
              }}
              data-test-id="stock-alerts-clear"
            >
              Marcar como leídas
            </button>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="relative z-100 shrink-0" data-test-id="stock-alerts-dropdown-root">
      <div ref={triggerWrapRef} className="relative inline-flex shrink-0">
        <IconButton
          icon="Bell"
          variant="text"
          size="md"
          ariaLabel={`Alertas${stockAlertCount > 0 ? `: ${stockAlertCount} nuevas` : ""}`}
          title="Alertas"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          data-test-id="stock-alerts-trigger"
        />
        <PosTopBarCountBadge count={stockAlertCount} />
      </div>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
