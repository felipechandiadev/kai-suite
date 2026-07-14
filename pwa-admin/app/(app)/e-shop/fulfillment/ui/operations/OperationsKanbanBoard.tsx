"use client";

import type {
  DeliveryOperationsBoard,
  DeliveryOperationsStatus,
} from "@/features/e-shop-delivery/types/delivery.types";
import { OperationsKanbanColumn } from "./OperationsKanbanColumn";
import { OPERATIONS_STAGES } from "./operations.utils";

type OperationsKanbanBoardProps = {
  board: DeliveryOperationsBoard;
  selected: Set<string>;
  pending: boolean;
  pendingOrderId: string | null;
  searchQuery: string;
  hasSelection: boolean;
  onToggleSelect: (orderId: string) => void;
  onAdvance: (orderId: string, nextStatus: DeliveryOperationsStatus) => void;
  onToggleLinePicked: (
    orderId: string,
    lineId: string,
    isPicked: boolean,
  ) => void;
  onPickAllLines: (orderId: string, advanceTo?: "READY_FOR_DISPATCH") => void;
};

export function OperationsKanbanBoard({
  board,
  selected,
  pending,
  pendingOrderId,
  searchQuery,
  hasSelection,
  onToggleSelect,
  onAdvance,
  onToggleLinePicked,
  onPickAllLines,
}: OperationsKanbanBoardProps) {
  return (
    <div
      className={`min-h-0 flex-1 overflow-x-auto ${hasSelection ? "pb-24" : "pb-2"}`}
    >
      <div className="flex h-full min-h-[min(70vh,720px)] gap-3 snap-x snap-mandatory">
        {OPERATIONS_STAGES.map((stage) => (
          <div key={stage} className="snap-start">
            <OperationsKanbanColumn
              stage={stage}
              orders={board.ordersByStatus[stage] ?? []}
              selected={selected}
              pending={pending}
              pendingOrderId={pendingOrderId}
              searchQuery={searchQuery}
              routeStarted={board.occurrence?.routeStatus === "out"}
              onToggleSelect={onToggleSelect}
              onAdvance={onAdvance}
              onToggleLinePicked={onToggleLinePicked}
              onPickAllLines={onPickAllLines}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
