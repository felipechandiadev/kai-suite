"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  adminFillViewportBelowTopBarClassName,
  Alert,
  Button,
  TextField,
} from "@kai/ui";
import {
  assignDeliveryOccurrenceDriverAction,
  optimizeDeliveryOccurrenceRouteAction,
  pickAllDeliveryOrderLinesAction,
  startDeliveryOccurrenceRouteAction,
  toggleDeliveryOrderLinePickedAction,
  updateDeliveryOrderStatusAction,
} from "@/features/e-shop-delivery/actions/delivery.action";
import type {
  DeliveryDriverRow,
  DeliveryOccurrenceRow,
  DeliveryOperationsBoard,
  DeliveryOperationsStatus,
  DeliverySourceChannel,
} from "@/features/e-shop-delivery/types/delivery.types";
import { OperationsBatchBar } from "./OperationsBatchBar";
import { OperationsKanbanBoard } from "./OperationsKanbanBoard";
import { OperationsToolbar } from "./OperationsToolbar";
import {
  applyOperationsParams,
  OPERATIONS_ROUTE,
  type OperationsBoardParams,
} from "./operations-board-params";
import {
  primaryNextStatus,
  runWithConcurrency,
  totalActiveOrders,
} from "./operations.utils";

type OperationsWorkspaceProps = {
  initialBoard: DeliveryOperationsBoard;
  initialOccurrences: DeliveryOccurrenceRow[];
  initialDrivers: DeliveryDriverRow[];
  initialDate: string;
  initialOccurrenceId: string | null;
  initialSearch: string;
};

export function OperationsWorkspace({
  initialBoard,
  initialOccurrences,
  initialDrivers,
  initialDate,
  initialOccurrenceId,
  initialSearch,
}: OperationsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const board = initialBoard;
  const date = searchParams.get("date") ?? initialDate;
  const occurrenceId =
    searchParams.get("occurrenceId") ??
    initialOccurrenceId ??
    board.occurrence?.id ??
    null;
  const searchQuery = searchParams.get("search") ?? initialSearch;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<"ALL" | DeliverySourceChannel>(
    "ALL",
  );

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSearchRef = useRef(searchQuery);

  useEffect(() => {
    if (previousSearchRef.current !== searchQuery) {
      setSelected(new Set());
      setSearchInput(searchQuery);
      previousSearchRef.current = searchQuery;
    }
  }, [searchQuery]);

  const navigate = useCallback(
    (params: OperationsBoardParams, mode: "push" | "replace" = "push") => {
      const query = applyOperationsParams(searchParams.toString(), params).toString();
      const href = query ? `${OPERATIONS_ROUTE}?${query}` : OPERATIONS_ROUTE;
      if (mode === "replace") router.replace(href);
      else router.push(href);
      router.refresh();
    },
    [router, searchParams],
  );

  const pushSearch = useCallback(
    (value: string) => {
      navigate({ search: value.trim() === "" ? null : value }, "replace");
    },
    [navigate],
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setSearchInput(value);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => pushSearch(value), 300);
    },
    [pushSearch],
  );

  const clearSearch = useCallback(() => {
    setSearchInput("");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    pushSearch("");
  }, [pushSearch]);

  const filteredBoard: DeliveryOperationsBoard = (() => {
    if (channelFilter === "ALL") return board;
    const ordersByStatus: DeliveryOperationsBoard["ordersByStatus"] = {};
    const totals: DeliveryOperationsBoard["totals"] = {};
    for (const [status, orders] of Object.entries(board.ordersByStatus)) {
      const filtered = (orders ?? []).filter(
        (order) => (order.sourceChannel ?? "ESHOP") === channelFilter,
      );
      if (filtered.length > 0) {
        ordersByStatus[status] = filtered;
        totals[status] = filtered.length;
      }
    }
    return { ...board, ordersByStatus, totals };
  })();

  const allOrders = Object.values(filteredBoard.ordersByStatus)
    .flat()
    .filter((order): order is NonNullable<typeof order> => order != null);
  const selectedOrders = allOrders.filter((order) => selected.has(order.id));
  const matchedOrdersCount = totalActiveOrders(filteredBoard);

  const channelCounts = (() => {
    const all = Object.values(board.ordersByStatus)
      .flat()
      .filter((order): order is NonNullable<typeof order> => order != null);
    return {
      ALL: all.length,
      POS: all.filter((o) => (o.sourceChannel ?? "ESHOP") === "POS").length,
      ESHOP: all.filter((o) => (o.sourceChannel ?? "ESHOP") === "ESHOP").length,
    };
  })();

  const batchNextStatus: DeliveryOperationsStatus | null = (() => {
    if (selectedOrders.length === 0) return null;
    const first = selectedOrders[0];
    const next = primaryNextStatus(
      first.deliveryStatus,
      first.allowedNextStatuses,
    );
    if (!next) return null;
    const allSame = selectedOrders.every(
      (order) =>
        primaryNextStatus(order.deliveryStatus, order.allowedNextStatuses) ===
        next,
    );
    return allSame ? next : null;
  })();

  function toggleOrder(orderId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function handleAdvance(orderId: string, nextStatus: DeliveryOperationsStatus) {
    setPendingOrderId(orderId);
    startTransition(async () => {
      const result = await updateDeliveryOrderStatusAction(orderId, nextStatus);
      setPendingOrderId(null);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setMessage(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      router.refresh();
    });
  }

  function handleToggleLinePicked(
    orderId: string,
    lineId: string,
    isPicked: boolean,
  ) {
    setPendingOrderId(orderId);
    startTransition(async () => {
      const result = await toggleDeliveryOrderLinePickedAction(
        orderId,
        lineId,
        isPicked,
      );
      setPendingOrderId(null);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setMessage(null);
      router.refresh();
    });
  }

  function handlePickAllLines(
    orderId: string,
    advanceTo?: "READY_FOR_DISPATCH",
  ) {
    setPendingOrderId(orderId);
    startTransition(async () => {
      const result = await pickAllDeliveryOrderLinesAction(orderId, advanceTo);
      setPendingOrderId(null);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setMessage(null);
      router.refresh();
    });
  }

  function handleAdvanceBatch() {
    if (!batchNextStatus || selectedOrders.length === 0) return;
    const targetStatus = batchNextStatus;
    startTransition(async () => {
      const ids = selectedOrders.map((order) => order.id);
      let failed: string | null = null;
      await runWithConcurrency(ids, 5, async (id) => {
        if (failed) return;
        const result = await updateDeliveryOrderStatusAction(id, targetStatus);
        if (!result.success) failed = result.error;
      });
      if (failed) {
        setMessage(failed);
        return;
      }
      setMessage(null);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div
      className={`flex min-h-0 flex-col gap-4 ${adminFillViewportBelowTopBarClassName}`}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Repartos
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div
            className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-0.5"
            role="group"
            aria-label="Filtrar por canal"
            data-test-id="repartos-channel-filter"
          >
            {(
              [
                { id: "ALL", label: "Todos" },
                { id: "POS", label: "POS" },
                { id: "ESHOP", label: "eShop" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChannelFilter(opt.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  channelFilter === opt.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {opt.label}
                <span className="ml-1 opacity-70">{channelCounts[opt.id]}</span>
              </button>
            ))}
          </div>
          <div className="w-full shrink-0 sm:w-72">
            <TextField
              label="Buscar"
              name="operations-search"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Buscar"
              startAdornment={
                <Search className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              }
              density="compact"
              disabled={pending}
              className="w-full"
              data-test-id="operations-search-input"
              onKeyDown={(event) => {
                if (event.key === "Escape" && searchInput) {
                  event.preventDefault();
                  clearSearch();
                }
              }}
            />
          </div>
        </div>
      </header>

      {board.submittedCount > 0 ? (
        <Alert variant="info">
          {board.submittedCount === 1
            ? "1 pedido nuevo sin confirmar"
            : `${board.submittedCount} pedidos nuevos sin confirmar`}{" "}
          esperan revisión antes de entrar a la operación.
        </Alert>
      ) : null}

      {searchQuery.trim() ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm">
          <p className="text-muted-foreground">
            {matchedOrdersCount}{" "}
            {matchedOrdersCount === 1 ? "pedido coincide" : "pedidos coinciden"}{" "}
            con «{searchQuery.trim().replace(/^#/, "")}»
          </p>
          <Button type="button" variant="text" size="sm" onClick={clearSearch}>
            Limpiar búsqueda
          </Button>
        </div>
      ) : null}

      <OperationsToolbar
        board={filteredBoard}
        repartos={initialOccurrences.filter(
          (reparto) => (reparto.kind ?? "LOCAL_DELIVERY") === "LOCAL_DELIVERY",
        )}
        drivers={initialDrivers}
        date={date}
        activeOccurrenceId={occurrenceId}
        pending={pending}
        disabled={pending}
        onDateChange={(nextDate) => {
          const dayRepartos = initialOccurrences.filter(
            (reparto) =>
              (reparto.kind ?? "LOCAL_DELIVERY") === "LOCAL_DELIVERY" &&
              reparto.occurrenceDate === nextDate &&
              !reparto.isCancelled,
          );
          const nextOccurrenceId = dayRepartos[0]?.id;
          navigate({
            date: nextDate,
            occurrenceId: nextOccurrenceId ?? null,
          });
        }}
        onRepartoChange={(id) => navigate({ occurrenceId: id })}
        onDriverChange={(driverUserId) => {
          if (!board.occurrence) return;
          startTransition(async () => {
            const result = await assignDeliveryOccurrenceDriverAction(
              board.occurrence!.id,
              driverUserId,
            );
            if (!result.success) {
              setMessage(result.error);
              return;
            }
            setMessage(null);
            router.refresh();
          });
        }}
        onOptimizeRoute={() => {
          if (!board.occurrence) return;
          startTransition(async () => {
            const result = await optimizeDeliveryOccurrenceRouteAction(
              board.occurrence!.id,
            );
            if (!result.success) {
              setMessage(result.error);
              return;
            }
            setMessage(null);
            router.refresh();
          });
        }}
        onStartRoute={() => {
          if (!board.occurrence) return;
          startTransition(async () => {
            const result = await startDeliveryOccurrenceRouteAction(
              board.occurrence!.id,
            );
            if (!result.success) {
              setMessage(result.error);
              return;
            }
            setMessage(null);
            router.refresh();
          });
        }}
      />

      {message ? <Alert variant="error">{message}</Alert> : null}

      {!board.occurrence ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            No hay reparto programado para esta fecha
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea un reparto en el calendario o elige otra fecha
          </p>
        </div>
      ) : (
        <>
          <OperationsKanbanBoard
            board={filteredBoard}
            selected={selected}
            pending={pending}
            pendingOrderId={pendingOrderId}
            searchQuery={searchQuery}
            hasSelection={selected.size > 0}
            onToggleSelect={toggleOrder}
            onAdvance={handleAdvance}
            onToggleLinePicked={handleToggleLinePicked}
            onPickAllLines={handlePickAllLines}
          />

          <OperationsBatchBar
            selectedCount={selected.size}
            batchNextStatus={batchNextStatus}
            pending={pending}
            onAdvanceBatch={handleAdvanceBatch}
            onClearSelection={() => setSelected(new Set())}
          />
        </>
      )}
    </div>
  );
}
