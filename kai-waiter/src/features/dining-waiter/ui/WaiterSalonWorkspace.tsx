"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  DiningOrderDto,
  DiningRoomDto,
  DiningTableDto,
} from "@/features/dining-waiter/infrastructure/dining.request";
import {
  getDiningNumberingSettingsAction,
  getDiningOrderAction,
  getDiningRoomAction,
  listActiveDiningOrdersAction,
  listDiningRoomsAction,
  openTableOrderAction,
} from "@/features/dining-waiter/actions/waiter.action";
import { WaiterMesasCards } from "@/features/dining-waiter/ui/WaiterMesasCards";
import { WaiterTableScreen } from "@/features/dining-waiter/ui/WaiterTableScreen";
import { useDiningRealtime } from "@/features/dining-waiter/realtime/useDiningRealtime";
import {
  loadWaiterRoomId,
  saveWaiterRoomId,
  type WaiterSession,
} from "@/lib/app-session";

type WaiterSalonWorkspaceProps = {
  session: WaiterSession;
};

function clearSalonDeepLinkQuery(pathname: string, router: ReturnType<typeof useRouter>) {
  router.replace(pathname || "/salon");
}

export function WaiterSalonWorkspace({ session }: WaiterSalonWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<DiningRoomDto[]>([]);
  const [room, setRoom] = useState<DiningRoomDto | null>(null);
  const [orders, setOrders] = useState<DiningOrderDto[]>([]);
  const [selectedTable, setSelectedTable] = useState<DiningTableDto | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<DiningOrderDto | null>(null);
  const [highlightFireId, setHighlightFireId] = useState<string | null>(null);
  const [openCuentaOnSelect, setOpenCuentaOnSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [canOpenTable, setCanOpenTable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authRef = useRef({ userId: session.userId, companyId: session.companyId });
  authRef.current = { userId: session.userId, companyId: session.companyId };
  const deepLinkHandledRef = useRef<string | null>(null);

  const branchId = room?.branchId ?? "";

  const refreshOrders = useCallback(async () => {
    if (!branchId) return [];
    const auth = authRef.current;
    const list = await listActiveDiningOrdersAction({ ...auth, branchId });
    setOrders(list);
    return list;
  }, [branchId]);

  const loadRoom = useCallback(async (roomId: string) => {
    setLoading(true);
    setError(null);
    try {
      const auth = authRef.current;
      const detail = await getDiningRoomAction({ ...auth, roomId });
      setRoom(detail);
      saveWaiterRoomId(roomId);
      const [list, settings] = await Promise.all([
        listActiveDiningOrdersAction({
          ...auth,
          branchId: detail.branchId,
        }),
        getDiningNumberingSettingsAction({
          ...auth,
          branchId: detail.branchId,
        }).catch(() => ({ allowWaiterOpenTable: true })),
      ]);
      setOrders(list);
      setCanOpenTable(settings.allowWaiterOpenTable !== false);
      return { detail, list };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar salón");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const auth = authRef.current;
        const list = await listDiningRoomsAction(auth);
        if (cancelled) return;
        setRooms(list);
        const savedRoomId = loadWaiterRoomId();
        const initial =
          (savedRoomId && list.find((r) => r.id === savedRoomId)) ?? list[0] ?? null;
        if (initial) {
          await loadRoom(initial.id);
        } else {
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar salones");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.userId, session.companyId, loadRoom]);

  const handleSelectOccupied = async (
    table: DiningTableDto,
    orderId: string,
    opts?: { highlightFireId?: string | null; openCuenta?: boolean },
  ) => {
    setSelectedTable(table);
    setError(null);
    setHighlightFireId(opts?.highlightFireId ?? null);
    setOpenCuentaOnSelect(Boolean(opts?.openCuenta || opts?.highlightFireId));
    try {
      const order = await getDiningOrderAction({
        ...authRef.current,
        orderId,
      });
      setSelectedOrder(order);
    } catch (e) {
      setSelectedOrder(null);
      setError(e instanceof Error ? e.message : "Error al cargar cuenta");
    }
  };

  const handleBackToSalon = () => {
    setSelectedTable(null);
    setSelectedOrder(null);
    setHighlightFireId(null);
    setOpenCuentaOnSelect(false);
    setError(null);
    void refreshOrders();
  };

  const handleOpenTable = async (table?: DiningTableDto) => {
    const target = table ?? selectedTable;
    if (!target || !branchId) return;
    setOpening(true);
    setError(null);
    try {
      const order = await openTableOrderAction({
        ...authRef.current,
        branchId,
        diningTableId: target.id,
      });
      setSelectedTable(target);
      setSelectedOrder(order);
      await refreshOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la mesa");
    } finally {
      setOpening(false);
    }
  };

  const handleOrderUpdated = async (order: DiningOrderDto) => {
    setSelectedOrder(order);
    await refreshOrders();
  };

  // Deep-link: /salon?orderId=&fireId=&tableId=
  useEffect(() => {
    const orderId = searchParams.get("orderId")?.trim() || "";
    const fireId = searchParams.get("fireId")?.trim() || "";
    const tableId = searchParams.get("tableId")?.trim() || "";
    if (!orderId && !tableId) return;

    const key = `${orderId}|${fireId}|${tableId}`;
    if (deepLinkHandledRef.current === key) return;
    if (loading || rooms.length === 0) return;

    deepLinkHandledRef.current = key;
    let cancelled = false;

    (async () => {
      try {
        const auth = authRef.current;
        if (orderId) {
          const order = await getDiningOrderAction({ ...auth, orderId });
          if (cancelled) return;
          if (order.status === "CLOSED") {
            setError("La cuenta ya está cerrada.");
            clearSalonDeepLinkQuery(pathname, router);
            return;
          }
          let table: DiningTableDto | null = null;
          const tid = order.diningTableId || tableId;
          if (tid && room?.tables) {
            table = room.tables.find((t) => t.id === tid) ?? null;
          }
          if (!table && tid) {
            for (const r of rooms) {
              const detail =
                r.id === room?.id
                  ? room
                  : await getDiningRoomAction({ ...auth, roomId: r.id });
              if (cancelled) return;
              const found = detail.tables?.find((t) => t.id === tid) ?? null;
              if (found) {
                if (r.id !== room?.id) {
                  await loadRoom(r.id);
                }
                table = found;
                break;
              }
            }
          }
          if (!table) {
            setError("No se encontró la mesa de esa notificación.");
            clearSalonDeepLinkQuery(pathname, router);
            return;
          }
          await handleSelectOccupied(table, order.id, {
            highlightFireId: fireId || null,
            openCuenta: true,
          });
          clearSalonDeepLinkQuery(pathname, router);
          return;
        }

        if (tableId) {
          let table: DiningTableDto | null =
            room?.tables?.find((t) => t.id === tableId) ?? null;
          if (!table) {
            for (const r of rooms) {
              const detail =
                r.id === room?.id
                  ? room
                  : await getDiningRoomAction({ ...auth, roomId: r.id });
              if (cancelled) return;
              const found = detail.tables?.find((t) => t.id === tableId) ?? null;
              if (found) {
                if (r.id !== room?.id) await loadRoom(r.id);
                table = found;
                break;
              }
            }
          }
          if (!table) {
            setError("No se encontró la mesa.");
            clearSalonDeepLinkQuery(pathname, router);
            return;
          }
          const list = await refreshOrders();
          const active = (list ?? orders).find(
            (o) =>
              o.diningTableId === tableId &&
              o.status !== "CLOSED" &&
              o.kind === "TABLE",
          );
          if (!active) {
            setError("La mesa ya no tiene cuenta abierta.");
            clearSalonDeepLinkQuery(pathname, router);
            return;
          }
          await handleSelectOccupied(table, active.id, {
            highlightFireId: fireId || null,
            openCuenta: true,
          });
          clearSalonDeepLinkQuery(pathname, router);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo abrir la cuenta de la notificación.",
          );
          clearSalonDeepLinkQuery(pathname, router);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once per query key
  }, [searchParams, loading, rooms, room, pathname, router, loadRoom, refreshOrders]);

  useDiningRealtime({
    userId: session.userId,
    activeCompanyId: session.companyId,
    salonId: room?.id ?? null,
    onSessionUpdated: () => {
      void refreshOrders().then((list) => {
        if (!selectedOrder || !list) return;
        const fresh = list.find((o) => o.id === selectedOrder.id);
        if (fresh) {
          void getDiningOrderAction({
            ...authRef.current,
            orderId: fresh.id,
          })
            .then(setSelectedOrder)
            .catch(() => undefined);
        }
      });
    },
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Cargando salón…
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No hay salones configurados. Crea uno en kai-admin.
      </div>
    );
  }

  if (selectedTable) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {error ? <p className="mb-2 text-sm text-red-500">{error}</p> : null}
        <WaiterTableScreen
          key={`${selectedOrder?.id ?? selectedTable.id}-${highlightFireId ?? ""}-${openCuentaOnSelect ? "cuenta" : "menu"}`}
          session={session}
          branchId={branchId}
          table={selectedTable}
          order={selectedOrder}
          onBack={handleBackToSalon}
          onOpenTable={() => handleOpenTable()}
          onOrderUpdated={handleOrderUpdated}
          opening={opening}
          canOpenTable={canOpenTable}
          initialPanel={openCuentaOnSelect ? "cuenta" : "menu"}
          highlightFireId={highlightFireId}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3" data-test-id="waiter-salon-workspace">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground" data-test-id="waiter-mesas-title">
          Mesas
        </h1>
        {rooms.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedTable(null);
                  setSelectedOrder(null);
                  void loadRoom(r.id);
                }}
                className={`shrink-0 rounded-md border px-3 py-1.5 text-sm ${
                  room?.id === r.id
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border hover:border-primary/50"
                }`}
                data-test-id={`waiter-room-chip-${r.id}`}
              >
                {r.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {room ? (
        <WaiterMesasCards
          room={room}
          orders={orders}
          canOpenTable={canOpenTable}
          opening={opening}
          onOpenTable={(table) => void handleOpenTable(table)}
          onSelectOccupied={handleSelectOccupied}
        />
      ) : null}
    </div>
  );
}
