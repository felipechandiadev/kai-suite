"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DiningOrderDto,
  DiningRoomDto,
  DiningTableDto,
} from "@/features/dining-waiter/infrastructure/dining.request";
import {
  getDiningOrderAction,
  getDiningRoomAction,
  listActiveDiningOrdersAction,
  listDiningRoomsAction,
  openTableOrderAction,
} from "@/features/dining-waiter/actions/waiter.action";
import { WaiterFloorPlan } from "@/features/dining-waiter/ui/WaiterFloorPlan";
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

export function WaiterSalonWorkspace({ session }: WaiterSalonWorkspaceProps) {
  const [rooms, setRooms] = useState<DiningRoomDto[]>([]);
  const [room, setRoom] = useState<DiningRoomDto | null>(null);
  const [orders, setOrders] = useState<DiningOrderDto[]>([]);
  const [selectedTable, setSelectedTable] = useState<DiningTableDto | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<DiningOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authRef = useRef({ userId: session.userId, companyId: session.companyId });
  authRef.current = { userId: session.userId, companyId: session.companyId };

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
      const list = await listActiveDiningOrdersAction({
        ...auth,
        branchId: detail.branchId,
      });
      setOrders(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar salón");
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

  const handleSelectTable = async (table: DiningTableDto, orderId?: string) => {
    setSelectedTable(table);
    setError(null);
    if (orderId) {
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
    } else {
      setSelectedOrder(null);
    }
  };

  const handleBackToSalon = () => {
    setSelectedTable(null);
    setSelectedOrder(null);
    setError(null);
    void refreshOrders();
  };

  const handleOpenTable = async () => {
    if (!selectedTable || !branchId) return;
    setOpening(true);
    setError(null);
    try {
      const order = await openTableOrderAction({
        ...authRef.current,
        branchId,
        diningTableId: selectedTable.id,
      });
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
          }).then(setSelectedOrder).catch(() => undefined);
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
        No hay salones configurados. Crea uno en pwa-admin.
      </div>
    );
  }

  if (selectedTable) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {error ? <p className="mb-2 text-sm text-red-500">{error}</p> : null}
        <WaiterTableScreen
          session={session}
          table={selectedTable}
          order={selectedOrder}
          onBack={handleBackToSalon}
          onOpenTable={handleOpenTable}
          onOrderUpdated={handleOrderUpdated}
          opening={opening}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3" data-test-id="waiter-salon-workspace">
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
            >
              {r.name}
            </button>
          ))}
        </div>
      ) : room ? (
        <h1 className="text-base font-semibold text-foreground">{room.name}</h1>
      ) : null}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {room ? (
        <WaiterFloorPlan
          room={room}
          orders={orders}
          selectedTableId={null}
          onSelectTable={handleSelectTable}
        />
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Toca una mesa para abrir la comanda
      </p>
    </div>
  );
}
