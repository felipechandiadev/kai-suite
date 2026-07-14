"use client";

import { Button } from "@kai/ui";
import type { DeliveryOperationsStatus } from "@/features/e-shop-delivery/types/delivery.types";
import { advanceActionLabel } from "./operations.utils";

type OperationsBatchBarProps = {
  selectedCount: number;
  batchNextStatus: DeliveryOperationsStatus | null;
  pending: boolean;
  onAdvanceBatch: () => void;
  onClearSelection: () => void;
  onAssign?: () => void;
  showAssign?: boolean;
};

export function OperationsBatchBar({
  selectedCount,
  batchNextStatus,
  pending,
  onAdvanceBatch,
  onClearSelection,
  onAssign,
  showAssign = false,
}: OperationsBatchBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-6xl rounded-xl border border-border bg-card px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {selectedCount}{" "}
          {selectedCount === 1 ? "pedido seleccionado" : "pedidos seleccionados"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="text"
            size="sm"
            disabled={pending}
            onClick={onClearSelection}
          >
            Limpiar
          </Button>
          {showAssign && onAssign ? (
            <Button
              type="button"
              variant="outlined"
              size="sm"
              disabled={pending}
              onClick={onAssign}
            >
              Asignar a despacho
            </Button>
          ) : null}
          {batchNextStatus ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={pending}
              loading={pending}
              className="min-h-[44px] lg:min-h-0"
              onClick={onAdvanceBatch}
            >
              {advanceActionLabel(batchNextStatus)} ({selectedCount})
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
