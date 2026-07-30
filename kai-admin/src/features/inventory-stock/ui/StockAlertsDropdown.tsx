"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { IconButton } from "@kai/ui";
import { TopBarNotificationCountBadge } from "@kai/print-service-client";
import { useStockRealtime } from "../realtime/stock-realtime-context";
import {
  formatReceivedAt,
  labelStockAlertKind,
  shortVariantId,
} from "../lib/stock-alert-copy";

export function StockAlertsDropdown() {
  const { stockAlertCount, lastStockEvents, clearStockAlerts } = useStockRealtime();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const alertRows = useMemo(
    () => lastStockEvents.filter((e) => Array.isArray(e.alerts) && e.alerts.length > 0),
    [lastStockEvents],
  );

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
    <div className="relative z-[100] shrink-0" ref={rootRef} data-test-id="stock-alerts-dropdown-root">
      <div className="relative inline-flex shrink-0">
        <IconButton
          icon="Bell"
          variant="action"
          size="md"
          strokeWidth={2.5}
          ariaLabel={`Alertas de stock${stockAlertCount > 0 ? `: ${stockAlertCount} nuevas` : ""}`}
          title="Alertas de stock"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          data-test-id="stock-alerts-trigger"
        />
        <TopBarNotificationCountBadge count={stockAlertCount} variant="secondary" />
      </div>
      {open ? (
        <div
          className="absolute right-0 z-[110] mt-1 flex max-h-[min(24rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-border bg-background text-foreground shadow-lg"
          role="dialog"
          aria-label="Alertas de stock"
          data-test-id="stock-alerts-popover"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <span className="text-sm font-semibold tracking-tight">Alertas de stock</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {alertRows.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Sin alertas recientes. Aparecerán al cargar la página o cuando el inventario cruce los umbrales (tiempo real).
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {alertRows.map((evt, idx) => (
                  <li
                    key={`${evt.productVariantId}-${evt.storageId}-${(evt as { receivedAt?: number }).receivedAt ?? idx}`}
                    className="px-3 py-2.5"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatReceivedAt((evt as { receivedAt?: number }).receivedAt)}
                    </p>
                    <p className="mt-1 text-xs">
                      Variante{" "}
                      <span className="font-mono text-foreground">{shortVariantId(evt.productVariantId)}</span>
                      {" · "}
                      Stock físico{" "}
                      <strong>{Number(evt.physicalStock).toLocaleString("es-CL", { maximumFractionDigits: 3 })}</strong>
                    </p>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-amber-800 dark:text-amber-200">
                      {evt.alerts!.map((a) => (
                        <li key={a} className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                          <span>{labelStockAlertKind(a)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {alertRows.length > 0 ? (
            <div className="border-t border-border bg-muted/30 px-2 py-2">
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-center text-sm font-medium hover:bg-muted"
                onClick={() => {
                  clearStockAlerts();
                  setOpen(false);
                }}
                data-test-id="stock-alerts-clear"
              >
                Marcar como leídas
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
