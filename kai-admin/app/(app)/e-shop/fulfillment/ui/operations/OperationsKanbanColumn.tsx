"use client";

import { useState } from "react";
import { IconButton } from "@kai/ui";
import type {
  DeliveryOperationsOrder,
  DeliveryOperationsStatus,
} from "@/features/e-shop-delivery/types/delivery.types";
import { OperationsKanbanCard } from "./OperationsKanbanCard";
import {
  orderMatchesOperationsSearch,
  STATUS_ICONS,
  STATUS_LABELS,
} from "./operations.utils";

type OperationsKanbanColumnProps = {
  stage: DeliveryOperationsStatus;
  orders: DeliveryOperationsOrder[];
  selected: Set<string>;
  pending: boolean;
  pendingOrderId: string | null;
  searchQuery: string;
  routeStarted: boolean;
  onToggleSelect: (orderId: string) => void;
  onAdvance: (orderId: string, nextStatus: DeliveryOperationsStatus) => void;
  onToggleLinePicked: (
    orderId: string,
    lineId: string,
    isPicked: boolean,
  ) => void;
  onPickAllLines: (orderId: string, advanceTo?: "READY_FOR_DISPATCH") => void;
};

export function OperationsKanbanColumn({
  stage,
  orders,
  selected,
  pending,
  pendingOrderId,
  searchQuery,
  routeStarted,
  onToggleSelect,
  onAdvance,
  onToggleLinePicked,
  onPickAllLines,
}: OperationsKanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(false);
  const normalizedQuery = searchQuery.trim().replace(/^#/, "");
  const StageIcon = STATUS_ICONS[stage];
  const stageLabel = STATUS_LABELS[stage];

  return (
    <section
      className={`flex h-full shrink-0 flex-col overflow-hidden bg-muted/15 transition-[width,min-width,max-width] duration-200 ease-out ${
        collapsed
          ? "w-14 min-w-14 max-w-14"
          : "min-w-[min(85vw,300px)] max-w-[320px]"
      }`}
      title={collapsed ? stageLabel : undefined}
      aria-label={collapsed ? `${stageLabel} (${orders.length})` : undefined}
    >
      <header
        className={`sticky top-0 z-10 shrink-0 border-b border-border/70 bg-card/95 backdrop-blur-sm ${
          collapsed ? "flex flex-col items-center gap-2 px-1 py-3" : "px-2 py-3"
        }`}
      >
        {collapsed ? (
          <>
            <IconButton
              icon="ChevronRight"
              variant="neutral"
              size="xs"
              ariaLabel={`Expandir columna ${stageLabel}`}
              aria-expanded={false}
              onClick={() => setCollapsed(false)}
            />
            {StageIcon ? (
              <StageIcon
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            ) : null}
            <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-secondary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">
              {orders.length}
            </span>
          </>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <IconButton
                icon="ChevronLeft"
                variant="neutral"
                size="xs"
                ariaLabel={`Contraer columna ${stageLabel}`}
                aria-expanded
                onClick={() => setCollapsed(true)}
              />
              {StageIcon ? (
                <StageIcon
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              ) : null}
              <h3 className="truncate text-sm font-semibold text-foreground">
                {stageLabel}
              </h3>
            </div>
            <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
              {orders.length}
            </span>
          </div>
        )}
      </header>

      {!collapsed ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {orders.length === 0 ? (
            <div className="rounded-xl bg-card/40 py-8 text-center">
              <p className="text-xs text-muted-foreground">Sin pedidos</p>
            </div>
          ) : (
            orders.map((order) => (
              <OperationsKanbanCard
                key={order.id}
                order={order}
                columnStage={stage}
                pending={pending}
                isActive={pending && pendingOrderId === order.id}
                selected={selected.has(order.id)}
                searchHighlight={
                  normalizedQuery.length > 0 &&
                  orderMatchesOperationsSearch(order, normalizedQuery)
                }
                routeStarted={routeStarted}
                onToggleSelect={onToggleSelect}
                onAdvance={onAdvance}
                onToggleLinePicked={onToggleLinePicked}
                onPickAllLines={onPickAllLines}
              />
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
