"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@kai/ui";
import type { DiningOrderLineDto } from "../infrastructure/dining-kds.request";
import {
  getKitchenQueueAction,
  markKitchenItemReadyAction,
} from "../actions/kds.action";
import { useDiningRealtime } from "../realtime/useDiningRealtime";
import {
  KDS_QUEUE_STATUSES,
  type DiningKitchenItemUpdatedPayload,
  type DiningKitchenSnapshotLinePayload,
  type DiningKitchenSnapshotPayload,
} from "../realtime/dining-realtime.types";
import {
  playKdsAlertSound,
  unlockKdsAlertAudio,
} from "../lib/play-kds-alert-sound";
import type { KdsSession } from "@/lib/app-session";

type KdsQueuePanelProps = {
  session: KdsSession;
  productionUnitId: string | null;
};

function snapshotLineToDto(
  line: DiningKitchenSnapshotLinePayload,
): DiningOrderLineDto {
  return {
    id: line.id,
    diningOrderId: line.diningOrderId,
    productVariantId: line.productVariantId,
    quantity: line.quantity,
    notes: line.notes ?? null,
    productionUnitId: line.productionUnitId ?? null,
    kitchenStatus: line.kitchenStatus,
    sentToKitchenAt: line.sentToKitchenAt ?? null,
    productVariant: line.productVariant
      ? { name: line.productVariant.name }
      : undefined,
    diningOrder: {
      id: line.diningOrderId,
      displayLabel: line.displayLabel ?? "Cuenta",
      kind: "",
      status: "",
      diningTable: line.diningTableCode
        ? { code: line.diningTableCode }
        : undefined,
    },
  };
}

export function KdsQueuePanel({ session, productionUnitId }: KdsQueuePanelProps) {
  const [lines, setLines] = useState<DiningOrderLineDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const knownIdsRef = useRef<Set<string>>(new Set());
  /** First queue apply after unit change must not alert. */
  const skipSoundRef = useRef(true);

  const auth = {
    userId: session.userId,
    companyId: session.companyId,
  };

  const applyQueue = useCallback((next: DiningOrderLineDto[]) => {
    const nextIds = new Set(next.map((l) => l.id));
    if (!skipSoundRef.current) {
      for (const id of nextIds) {
        if (!knownIdsRef.current.has(id)) {
          playKdsAlertSound();
          break;
        }
      }
    }
    knownIdsRef.current = nextIds;
    skipSoundRef.current = false;
    setLines(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!productionUnitId) {
      setLines([]);
      knownIdsRef.current = new Set();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const queue = await getKitchenQueueAction({
        ...auth,
        productionUnitId,
      });
      applyQueue(queue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cola");
    } finally {
      setLoading(false);
    }
  }, [productionUnitId, session.userId, session.companyId, applyQueue]);

  useEffect(() => {
    skipSoundRef.current = true;
    knownIdsRef.current = new Set();
    setLines([]);
    if (!productionUnitId) return;
    void refresh();
    // Bootstrap only when production unit changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [productionUnitId]);

  useEffect(() => {
    const unlock = () => unlockKdsAlertAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const handleSnapshot = useCallback(
    (payload: DiningKitchenSnapshotPayload) => {
      if (!productionUnitId || payload.unitId !== productionUnitId) return;
      applyQueue(payload.queue.map(snapshotLineToDto));
    },
    [productionUnitId, applyQueue],
  );

  const handleItemUpdated = useCallback(
    (payload: DiningKitchenItemUpdatedPayload) => {
      if (!productionUnitId || payload.unitId !== productionUnitId) return;
      if (!KDS_QUEUE_STATUSES.has(payload.kitchenStatus)) {
        setLines((prev) => {
          const next = prev.filter((l) => l.id !== payload.lineId);
          knownIdsRef.current = new Set(next.map((l) => l.id));
          return next;
        });
      }
    },
    [productionUnitId],
  );

  const { connected } = useDiningRealtime({
    userId: session.userId,
    activeCompanyId: session.companyId,
    productionUnitId,
    onKitchenSnapshot: handleSnapshot,
    onKitchenItemUpdated: handleItemUpdated,
  });

  const handleMarkReady = async (line: DiningOrderLineDto) => {
    unlockKdsAlertAudio();
    setMarkingId(line.id);
    setError(null);
    setLines((prev) => {
      const next = prev.filter((l) => l.id !== line.id);
      knownIdsRef.current = new Set(next.map((l) => l.id));
      return next;
    });
    try {
      await markKitchenItemReadyAction({
        ...auth,
        orderId: line.diningOrderId,
        lineId: line.id,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo marcar listo");
      skipSoundRef.current = true;
      await refresh();
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
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Cola de cocina</h2>
          <span
            className={
              connected
                ? "rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600"
                : "rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground"
            }
            data-test-id="kds-ws-status"
          >
            {connected ? "En vivo" : "Sin conexión"}
          </span>
        </div>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => {
            skipSoundRef.current = true;
            void refresh();
          }}
          loading={loading}
        >
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
                  onClick={() => void handleMarkReady(line)}
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
