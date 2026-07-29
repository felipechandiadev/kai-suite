"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, IconButton } from "@kai/ui";
import type {
  DiningOrderDto,
  DiningRoomDto,
  DiningTableDto,
} from "../infrastructure/dining.request";
import {
  kitchenProgressFromLines,
  waiterOrderAllKitchenReady,
  waiterOrderStatusLabel,
} from "../lib/group-waiter-order-lines";

export type WaiterTablesView = "list" | "grid";

const TABLES_VIEW_KEY = "kai-waiter-tables-view";

export function readWaiterTablesView(): WaiterTablesView {
  if (typeof window === "undefined") return "list";
  try {
    const v = localStorage.getItem(TABLES_VIEW_KEY);
    return v === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function writeWaiterTablesView(view: WaiterTablesView) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TABLES_VIEW_KEY, view);
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export type WaiterMesaCard = {
  tableId: string;
  code: string;
  label: string;
  roomId: string;
  roomName: string;
  table: DiningTableDto;
  order: DiningOrderDto | null;
};

type WaiterMesasCardsProps = {
  room: DiningRoomDto;
  orders: DiningOrderDto[];
  canOpenTable: boolean;
  opening: boolean;
  onOpenTable: (table: DiningTableDto) => void;
  onSelectOccupied: (table: DiningTableDto, orderId: string) => void;
  estimateOrderTotal?: (order: DiningOrderDto) => number;
};

export function WaiterMesasCards({
  room,
  orders,
  canOpenTable,
  opening,
  onOpenTable,
  onSelectOccupied,
  estimateOrderTotal,
}: WaiterMesasCardsProps) {
  const [tablesView, setTablesView] = useState<WaiterTablesView>("list");

  useEffect(() => {
    setTablesView(readWaiterTablesView());
  }, []);

  const setViewPersist = (view: WaiterTablesView) => {
    setTablesView(view);
    writeWaiterTablesView(view);
  };

  const mesaCards = useMemo((): WaiterMesaCard[] => {
    const orderByTableId = new Map<string, DiningOrderDto>();
    for (const order of orders) {
      if (
        order.status !== "CLOSED" &&
        order.kind === "TABLE" &&
        order.diningTableId
      ) {
        orderByTableId.set(order.diningTableId, order);
      }
    }
    const tables = [...(room.tables ?? [])].sort((a, b) =>
      (a.code || a.label).localeCompare(b.code || b.label, "es", {
        numeric: true,
      }),
    );
    return tables
      .filter((t) => Boolean(t.id))
      .map((t) => ({
        tableId: t.id,
        code: t.code,
        label: t.label || t.code,
        roomId: room.id,
        roomName: room.name,
        table: t,
        order: orderByTableId.get(t.id) ?? null,
      }));
  }, [orders, room]);

  const renderFree = (mesa: WaiterMesaCard) => {
    const title = mesa.label.startsWith("Mesa ")
      ? mesa.label
      : `Mesa ${mesa.code || mesa.label}`;
    const shortLabel = mesa.code?.trim() || mesa.label;
    const openDisabled = opening || !canOpenTable;
    const openTitle = canOpenTable
      ? "Abrir mesa"
      : "Esta sucursal no permite abrir mesas desde el mesero";

    if (tablesView === "grid") {
      return (
        <button
          key={mesa.tableId}
          type="button"
          disabled={openDisabled}
          title={openTitle}
          aria-label={`Abrir mesa ${title}`}
          onClick={() => onOpenTable(mesa.table)}
          className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface p-2 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
          data-test-id={`waiter-table-free-${mesa.tableId}`}
          data-layout="grid"
        >
          <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
            {shortLabel}
          </span>
          <Badge variant="primary" className="text-[9px]">
            Libre
          </Badge>
        </button>
      );
    }

    return (
      <div
        key={mesa.tableId}
        className="flex w-full flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-left shadow-sm"
        data-test-id={`waiter-table-free-${mesa.tableId}`}
        data-layout="list"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {mesa.roomName}
            </p>
          </div>
          <Badge variant="primary" className="shrink-0 text-[10px]">
            Libre
          </Badge>
        </div>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          className="w-full"
          disabled={openDisabled}
          loading={opening}
          title={openTitle}
          onClick={() => onOpenTable(mesa.table)}
          data-test-id={`waiter-open-table-${mesa.tableId}`}
        >
          Abrir mesa
        </Button>
      </div>
    );
  };

  const renderOccupied = (mesa: WaiterMesaCard, order: DiningOrderDto) => {
    const lines = order.lines ?? [];
    const activeLines = lines.filter((l) => l.kitchenStatus !== "CANCELLED");
    const progress = kitchenProgressFromLines(lines);
    const isBilling = order.status === "BILLING";
    const allReady = !isBilling && waiterOrderAllKitchenReady(lines);
    const title =
      order.displayLabel ||
      (mesa.label.startsWith("Mesa ")
        ? mesa.label
        : `Mesa ${mesa.code || mesa.label}`);
    const estimated = estimateOrderTotal?.(order) ?? 0;
    const showKitchenProgress =
      !isBilling && (progress.inKitchen > 0 || progress.ready > 0);
    const tone = isBilling
      ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10"
      : allReady
        ? "border-success/40 bg-success/10 hover:border-success/50 hover:bg-success/15"
        : "border-border bg-surface hover:border-primary/40 hover:bg-primary/5";

    if (tablesView === "grid") {
      return (
        <button
          key={mesa.tableId}
          type="button"
          onClick={() => onSelectOccupied(mesa.table, order.id)}
          className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center shadow-sm transition-colors ${tone}`}
          data-test-id={`waiter-table-occupied-${mesa.tableId}`}
          data-all-ready={allReady ? "true" : "false"}
          data-billing={isBilling ? "true" : "false"}
          data-layout="grid"
        >
          <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
            {title}
          </span>
          {isBilling ? (
            <Badge variant="secondary-outlined" className="text-[9px]">
              Por cobrar
            </Badge>
          ) : showKitchenProgress ? (
            <span className="text-[9px] tabular-nums text-muted-foreground">
              {progress.inKitchen > 0 ? `Cocina ${progress.inKitchen}` : null}
              {progress.inKitchen > 0 && progress.ready > 0 ? " · " : null}
              {progress.ready > 0 ? `Listos ${progress.ready}` : null}
            </span>
          ) : (
            <Badge variant="secondary-outlined" className="text-[9px]">
              {waiterOrderStatusLabel(order.status)}
            </Badge>
          )}
          {estimateOrderTotal ? (
            <span className="text-[11px] font-semibold tabular-nums text-foreground">
              {formatMoney(estimated)}
            </span>
          ) : null}
        </button>
      );
    }

    return (
      <button
        key={mesa.tableId}
        type="button"
        onClick={() => onSelectOccupied(mesa.table, order.id)}
        className={`block w-full rounded-xl border p-3 text-left shadow-sm transition-colors ${tone}`}
        data-test-id={`waiter-table-occupied-${mesa.tableId}`}
        data-all-ready={allReady ? "true" : "false"}
        data-billing={isBilling ? "true" : "false"}
        data-layout="list"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {order.displayLabel}
            </p>
          </div>
          {isBilling ? (
            <Badge variant="secondary-outlined" className="shrink-0 text-[10px]">
              Por cobrar
            </Badge>
          ) : showKitchenProgress ? (
            <div className="flex max-w-[55%] shrink-0 flex-wrap justify-end gap-1">
              {progress.inKitchen > 0 ? (
                <Badge variant="primary-outlined" className="text-[10px]">
                  {`En cocina ${progress.inKitchen}`}
                </Badge>
              ) : null}
              {progress.ready > 0 ? (
                <Badge variant="success-outlined" className="text-[10px]">
                  {`Listos ${progress.ready}`}
                </Badge>
              ) : null}
            </div>
          ) : (
            <Badge variant="secondary-outlined" className="shrink-0 text-[10px]">
              {waiterOrderStatusLabel(order.status)}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="min-w-0 text-[11px] text-muted-foreground">
            {activeLines.length} ítem(s)
            {mesa.roomName ? ` · ${mesa.roomName}` : ""}
          </p>
          {estimateOrderTotal ? (
            <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatMoney(estimated)}
            </p>
          ) : null}
        </div>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="waiter-mesas-cards">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{room.name}</p>
        <IconButton
          icon={tablesView === "grid" ? "LayoutList" : "LayoutGrid"}
          variant="action"
          size="sm"
          className="shrink-0"
          ariaLabel={
            tablesView === "grid" ? "Vista lista de mesas" : "Vista grilla de mesas"
          }
          title={tablesView === "grid" ? "Vista lista" : "Vista grilla"}
          onClick={() => setViewPersist(tablesView === "grid" ? "list" : "grid")}
          data-test-id="waiter-tables-view-toggle"
        />
      </div>

      <div
        className={
          tablesView === "grid"
            ? "grid min-h-0 flex-1 grid-cols-3 content-start gap-2 overflow-y-auto sm:grid-cols-4"
            : "min-h-0 flex-1 space-y-2 overflow-y-auto"
        }
        data-tables-view={tablesView}
      >
        {mesaCards.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground">
            No hay mesas en este salón.
          </p>
        ) : null}
        {mesaCards.map((mesa) =>
          mesa.order ? renderOccupied(mesa, mesa.order) : renderFree(mesa),
        )}
      </div>
    </div>
  );
}
