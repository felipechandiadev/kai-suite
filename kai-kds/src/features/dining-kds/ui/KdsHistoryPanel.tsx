"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, IconButton } from "@kai/ui";
import { getProductionUnitHistoryAction } from "../actions/kds.action";
import type { ProductionUnitHistoryOrderDto } from "../infrastructure/dining-kds.request";
import { formatPrepDuration } from "../lib/format-prep-duration";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/kds-api-failure";
import type { KdsSession } from "@/lib/app-session";

type KdsHistoryPanelProps = {
  session: KdsSession;
  productionUnitId: string | null;
};

function formatItemTitle(item: ProductionUnitHistoryOrderDto["items"][number]) {
  const name = item.productVariant.name?.trim() || item.productVariant.id;
  const attrs = (item.productVariant.attributes ?? [])
    .map((a) => a.attributeValue.trim())
    .filter(Boolean);
  return [name, ...attrs].join(" · ");
}

function formatSentAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function KdsHistoryPanel({
  session,
  productionUnitId,
}: KdsHistoryPanelProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionUnitHistoryOrderDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!productionUnitId) {
      setOrders([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await getProductionUnitHistoryAction({
        userId: session.userId,
        companyId: session.companyId,
        productionUnitId,
      });
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (e) {
      if (redirectToLoginIfUnauthorized(e)) return;
      setError(e instanceof Error ? e.message : "No se pudo cargar el historial");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [productionUnitId, session.userId, session.companyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!productionUnitId) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-test-id="kds-history-no-unit"
      >
        Selecciona una unidad de producción para ver el historial del día.
      </p>
    );
  }

  return (
    <div data-test-id="kds-history-panel">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="sm"
            onClick={() => router.push("/queue")}
            ariaLabel="Volver a la cola"
            title="Volver a la cola"
            data-test-id="kds-history-back"
          />
          <h1 className="text-base font-semibold tracking-tight">
            Historial del día
          </h1>
        </div>
        {loading ? (
          <span className="text-xs text-muted-foreground">Actualizando…</span>
        ) : null}
      </div>

      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}

      {orders.length === 0 && !loading ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Sin pedidos en el día operativo actual.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((pedido) => (
            <article
              key={pedido.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
              data-test-id={`kds-history-pedido-${pedido.id}`}
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="warning-outlined"
                      className="text-[10px] tabular-nums"
                    >
                      Pedido #{pedido.sequenceNumber}
                      {pedido.sentAt ? (
                        <span className="ml-1.5 font-medium opacity-90">
                          {formatSentAt(pedido.sentAt)}
                        </span>
                      ) : null}
                    </Badge>
                    <Badge
                      variant={
                        pedido.status === "COMPLETED"
                          ? "success-outlined"
                          : pedido.status === "CANCELLED"
                            ? "error-outlined"
                            : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {pedido.status === "COMPLETED"
                        ? "Completado"
                        : pedido.status === "CANCELLED"
                          ? "Cancelado"
                          : "En curso"}
                    </Badge>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {pedido.displayLabel}
                    {pedido.diningTableCode
                      ? ` · Mesa ${pedido.diningTableCode}`
                      : ""}
                  </p>
                </div>
                <p
                  className="shrink-0 text-lg font-bold tabular-nums tracking-tight"
                  title="Tiempo de preparación del pedido"
                  data-test-id={`kds-history-pedido-duration-${pedido.id}`}
                >
                  {formatPrepDuration(pedido.prepDurationMs)}
                </p>
              </div>

              <ul className="flex flex-col gap-1.5">
                {pedido.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-border/60 bg-muted/15 px-2.5 py-1.5"
                    data-test-id={`kds-history-item-${item.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug">
                        <span className="mr-1.5 tabular-nums text-muted-foreground">
                          {item.quantity}×
                        </span>
                        {formatItemTitle(item)}
                      </p>
                      {item.notes ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="shrink-0 text-sm font-semibold tabular-nums"
                      title="Tiempo de preparación del ítem"
                    >
                      {formatPrepDuration(item.prepDurationMs)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
