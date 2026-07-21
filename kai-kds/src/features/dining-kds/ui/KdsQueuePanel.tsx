"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, IconButton } from "@kai/ui";
import type { DiningOrderLineDto } from "../infrastructure/dining-kds.request";
import { normalizeKitchenQueueLine } from "../infrastructure/dining-kds.request";
import {
  getKitchenQueueAction,
  markKitchenFireReadyAction,
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
import { redirectToLoginIfUnauthorized } from "@/lib/auth/kds-api-failure";
import {
  effectiveKitchenFireId,
  groupKitchenQueueByFire,
  type KdsPedidoGroup,
} from "../lib/group-kitchen-queue-by-fire";
import {
  groupPedidoLinesByItem,
  kdsItemGroupTestId,
  type KdsItemGroup,
} from "../lib/group-pedido-lines-by-item";
import { useKdsQueueRefresh } from "../station/kds-queue-refresh-context";
import type { KdsSession } from "@/lib/app-session";

type KdsQueuePanelProps = {
  session: KdsSession;
  productionUnitId: string | null;
};

function snapshotLineToDto(
  line: DiningKitchenSnapshotLinePayload,
): DiningOrderLineDto {
  return normalizeKitchenQueueLine(line);
}

function formatLineTitle(line: DiningOrderLineDto): string {
  const name = line.productVariant?.name?.trim() || line.productVariantId;
  const attrs = (line.productVariant?.attributes ?? [])
    .map((a) => a.attributeValue.trim())
    .filter(Boolean);
  return [name, ...attrs].join(" · ");
}

/** Hora 24h HH:mm (es-CL). */
function formatSentAt24h(iso: string | null): string {
  if (!iso) return "";
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

export function KdsQueuePanel({ session, productionUnitId }: KdsQueuePanelProps) {
  const [lines, setLines] = useState<DiningOrderLineDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingFireId, setMarkingFireId] = useState<string | null>(null);
  const { setQueueRefreshApi } = useKdsQueueRefresh();

  const knownFireIdsRef = useRef<Set<string>>(new Set());
  /** First queue apply after unit change must not alert. */
  const skipSoundRef = useRef(true);

  const auth = {
    userId: session.userId,
    companyId: session.companyId,
  };

  const pedidos = useMemo(() => groupKitchenQueueByFire(lines), [lines]);

  const applyQueue = useCallback((next: DiningOrderLineDto[]) => {
    const nextFireIds = new Set(next.map((l) => effectiveKitchenFireId(l)));
    if (!skipSoundRef.current) {
      for (const fireId of nextFireIds) {
        if (!knownFireIdsRef.current.has(fireId)) {
          playKdsAlertSound();
          break;
        }
      }
    }
    knownFireIdsRef.current = nextFireIds;
    skipSoundRef.current = false;
    setLines(next);
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!productionUnitId) {
      setLines([]);
      knownFireIdsRef.current = new Set();
      return;
    }
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const queue = await getKitchenQueueAction({
        ...auth,
        productionUnitId,
      });
      applyQueue(queue);
    } catch (e) {
      if (redirectToLoginIfUnauthorized(e)) return;
      setError(e instanceof Error ? e.message : "Error al cargar cola");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [productionUnitId, session.userId, session.companyId, applyQueue]);

  const refreshFromToolbar = useCallback(async () => {
    skipSoundRef.current = true;
    await refresh();
  }, [refresh]);

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
          knownFireIdsRef.current = new Set(
            next.map((l) => effectiveKitchenFireId(l)),
          );
          return next;
        });
        return;
      }
      // SENT / PREPARING: el payload no trae el detalle; refrescar cola en silencio.
      void refresh({ silent: true });
    },
    [productionUnitId, refresh],
  );

  const { connected } = useDiningRealtime({
    userId: session.userId,
    activeCompanyId: session.companyId,
    productionUnitId,
    onKitchenSnapshot: handleSnapshot,
    onKitchenItemUpdated: handleItemUpdated,
  });

  useEffect(() => {
    if (!productionUnitId) {
      setQueueRefreshApi(null);
      return () => setQueueRefreshApi(null);
    }
    setQueueRefreshApi({
      refresh: refreshFromToolbar,
      loading,
      connected,
    });
    return () => setQueueRefreshApi(null);
  }, [
    productionUnitId,
    refreshFromToolbar,
    loading,
    connected,
    setQueueRefreshApi,
  ]);

  useEffect(() => {
    skipSoundRef.current = true;
    knownFireIdsRef.current = new Set();
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

  const handleMarkItemReady = async (group: KdsItemGroup) => {
    unlockKdsAlertAudio();
    setMarkingId(group.key);
    setError(null);
    const lineIds = new Set(group.lines.map((l) => l.id));
    const orderId = group.lines[0]?.diningOrderId;
    if (!orderId || lineIds.size === 0) {
      setMarkingId(null);
      return;
    }
    try {
      for (const line of group.lines) {
        await markKitchenItemReadyAction({
          ...auth,
          orderId: line.diningOrderId,
          lineId: line.id,
        });
      }
      setLines((prev) => {
        const next = prev.filter((l) => !lineIds.has(l.id));
        knownFireIdsRef.current = new Set(
          next.map((l) => effectiveKitchenFireId(l)),
        );
        return next;
      });
    } catch (e) {
      if (redirectToLoginIfUnauthorized(e)) return;
      setError(e instanceof Error ? e.message : "No se pudo marcar listo");
      skipSoundRef.current = true;
      await refresh();
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkPedidoReady = async (pedido: KdsPedidoGroup) => {
    if (!productionUnitId) return;
    unlockKdsAlertAudio();
    setMarkingFireId(pedido.fireId);
    setError(null);
    const lineIds = new Set(pedido.lines.map((l) => l.id));
    setLines((prev) => {
      const next = prev.filter((l) => !lineIds.has(l.id));
      knownFireIdsRef.current = new Set(
        next.map((l) => effectiveKitchenFireId(l)),
      );
      return next;
    });
    try {
      await markKitchenFireReadyAction({
        ...auth,
        orderId: pedido.diningOrderId,
        fireId: pedido.fireId,
        productionUnitId,
      });
    } catch (e) {
      if (redirectToLoginIfUnauthorized(e)) return;
      setError(
        e instanceof Error ? e.message : "No se pudo marcar el pedido listo",
      );
      skipSoundRef.current = true;
      await refresh();
    } finally {
      setMarkingFireId(null);
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
      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}

      {pedidos.length === 0 && !loading ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Cola vacía — sin pedidos pendientes.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pedidos.map((pedido) => {
            const timeLabel = formatSentAt24h(pedido.sentToKitchenAt);
            const busyFire = markingFireId === pedido.fireId;
            const pedidoLabel =
              pedido.kitchenFireNumber != null
                ? `Pedido #${pedido.kitchenFireNumber}`
                : "Pedido";
            return (
              <article
                key={pedido.fireId}
                className="flex flex-col rounded-lg border-2 border-warning/40 bg-surface p-4 shadow-sm"
                data-test-id={`kds-pedido-${pedido.fireId}`}
              >
                <div className="mb-3 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="warning-outlined"
                      className="text-[10px] tabular-nums"
                      data-test-id={`kds-pedido-badge-${pedido.fireId}`}
                    >
                      {pedidoLabel}
                      {timeLabel ? (
                        <span className="ml-1.5 font-medium opacity-90">
                          {timeLabel}
                        </span>
                      ) : null}
                    </Badge>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span
                      className="truncate text-[11px] text-muted-foreground"
                      data-test-id={`kds-pedido-account-${pedido.fireId}`}
                    >
                      {pedido.displayLabel}
                    </span>
                    {pedido.tableCode ? (
                      <span
                        className="truncate text-[11px] text-muted-foreground"
                        data-test-id={`kds-pedido-table-${pedido.fireId}`}
                      >
                        Mesa {pedido.tableCode}
                      </span>
                    ) : null}
                  </div>
                </div>

                <ul className="mb-3 flex flex-1 flex-col gap-2">
                  {groupPedidoLinesByItem(pedido.lines).map((item) => {
                    const first = item.lines[0]!;
                    const testKey = kdsItemGroupTestId(item.key);
                    const pressed = markingId === item.key;
                    return (
                      <li
                        key={item.key}
                        className="rounded-md border border-border/80 bg-muted/20 px-2.5 py-2"
                        data-test-id={`kds-item-group-${testKey}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-snug">
                              {formatLineTitle(first)}
                            </p>
                            <p className="text-xs text-foreground/80">
                              Cant: {item.quantityTotal}
                              {item.notes ? (
                                <span className="font-medium">
                                  {" "}
                                  · {item.notes}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <IconButton
                            icon="Check"
                            variant="primaryCircle"
                            size="md"
                            className={
                              pressed
                                ? "shrink-0 !border-emerald-600 !bg-emerald-600 !text-white"
                                : "shrink-0"
                            }
                            iconClassName={
                              pressed ? "!text-white" : undefined
                            }
                            disabled={busyFire || (markingId != null && !pressed)}
                            onClick={() => void handleMarkItemReady(item)}
                            ariaLabel="Marcar listo"
                            title="Listo"
                            data-test-id={`kds-item-ready-${testKey}`}
                            data-ready-pressed={pressed ? "true" : "false"}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Button
                  type="button"
                  variant="primary"
                  className="mt-auto w-full"
                  loading={busyFire}
                  disabled={markingId != null}
                  onClick={() => void handleMarkPedidoReady(pedido)}
                  data-test-id={`kds-pedido-ready-${pedido.fireId}`}
                >
                  Marcar pedido listo
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
