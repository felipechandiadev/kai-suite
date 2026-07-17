"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@kai/ui";
import type { DiningOrderLineDto } from "../infrastructure/dining-kds.request";
import {
  getKitchenQueueAction,
  markKitchenItemReadyAction,
} from "../actions/kds.action";
import { useDiningRealtime } from "../realtime/useDiningRealtime";
import type { KdsSession } from "@/lib/app-session";

type KdsQueuePanelProps = {
  session: KdsSession;
  productionUnitId: string | null;
};

export function KdsQueuePanel({ session, productionUnitId }: KdsQueuePanelProps) {
  const [lines, setLines] = useState<DiningOrderLineDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const auth = {
    userId: session.userId,
    companyId: session.companyId,
  };

  const refresh = useCallback(async () => {
    if (!productionUnitId) {
      setLines([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const queue = await getKitchenQueueAction({
        ...auth,
        productionUnitId,
      });
      setLines(queue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cola");
    } finally {
      setLoading(false);
    }
  }, [productionUnitId, session.userId, session.companyId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  useDiningRealtime({
    userId: session.userId,
    activeCompanyId: session.companyId,
    productionUnitId,
    onKitchenItemUpdated: () => {
      void refresh();
    },
    onKitchenSnapshot: () => {
      void refresh();
    },
  });

  const handleMarkReady = async (line: DiningOrderLineDto) => {
    setMarkingId(line.id);
    setError(null);
    try {
      await markKitchenItemReadyAction({
        ...auth,
        orderId: line.diningOrderId,
        lineId: line.id,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo marcar listo");
    } finally {
      setMarkingId(null);
    }
  };

  if (!productionUnitId) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="kds-queue-no-unit">
        Selecciona una unidad de producción para ver la cola.
      </p>
    );
  }

  return (
    <div data-test-id="kds-queue-panel">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Cola de cocina</h2>
        <Button type="button" variant="outlined" size="sm" onClick={refresh} loading={loading}>
          Actualizar
        </Button>
      </div>

      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}

      {lines.length === 0 && !loading ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Cola vacía — sin ítems pendientes.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lines.map((line) => {
            const order = line.diningOrder;
            const tableCode = order?.diningTable?.code;
            return (
              <article
                key={line.id}
                className="flex flex-col rounded-lg border-2 border-warning/40 bg-surface p-4 shadow-sm"
                data-test-id={`kds-card-${line.id}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {order?.displayLabel ?? "Cuenta"}
                    </p>
                    {tableCode ? (
                      <p className="text-xs text-muted-foreground">Mesa {tableCode}</p>
                    ) : null}
                  </div>
                  <span className="rounded bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">
                    {line.kitchenStatus}
                  </span>
                </div>
                <p className="mb-1 text-lg font-semibold">
                  {line.productVariant?.name ?? line.productVariantId}
                </p>
                <p className="mb-3 text-sm text-muted-foreground">
                  Cant: {line.quantity}
                  {line.notes ? ` · ${line.notes}` : ""}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  className="mt-auto w-full"
                  loading={markingId === line.id}
                  onClick={() => handleMarkReady(line)}
                >
                  Marcar listo
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
