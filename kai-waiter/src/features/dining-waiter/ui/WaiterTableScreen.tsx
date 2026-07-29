"use client";

import { useState } from "react";
import { Button, IconButton } from "@kai/ui";
import type {
  DiningOrderDto,
  DiningTableDto,
} from "../infrastructure/dining.request";
import { WaiterMenuPanel } from "./WaiterMenuPanel";
import { WaiterCuentaPanel } from "./WaiterCuentaPanel";
import type { WaiterSession } from "@/lib/app-session";

type TablePanel = "menu" | "cuenta";

const ORDER_STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierta",
  SENT: "En cocina",
  PARTIAL_READY: "Parcial lista",
  READY: "Lista",
  BILLING: "Cuenta pedida",
  CLOSED: "Cerrada",
};

type WaiterTableScreenProps = {
  session: WaiterSession;
  branchId: string;
  table: DiningTableDto;
  order: DiningOrderDto | null;
  onBack: () => void;
  onOpenTable: () => Promise<void>;
  onOrderUpdated: (order: DiningOrderDto) => void;
  opening?: boolean;
  canOpenTable?: boolean;
};

export function WaiterTableScreen({
  session,
  branchId,
  table,
  order,
  onBack,
  onOpenTable,
  onOrderUpdated,
  opening = false,
  canOpenTable = true,
}: WaiterTableScreenProps) {
  const [panel, setPanel] = useState<TablePanel>("menu");
  const lineCount = order?.lines?.length ?? 0;
  const draftCount =
    order?.lines?.filter((l) => l.kitchenStatus === "DRAFT").length ?? 0;

  const tableTitle = table.label || table.code;

  if (!order) {
    return (
      <div className="flex flex-1 flex-col gap-4" data-test-id="waiter-table-empty">
        <div className="flex items-center gap-2">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="md"
            onClick={onBack}
            ariaLabel="Volver a Mesas"
            data-test-id="waiter-table-back"
          />
          <div className="min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="text-left text-xs font-medium text-primary"
              data-test-id="waiter-back-to-mesas"
            >
              Volver a Mesas
            </button>
            <h1 className="truncate text-lg font-semibold text-foreground">
              Mesa {tableTitle}
            </h1>
            <p className="text-xs text-muted-foreground">Sin cuenta abierta</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center">
          {canOpenTable ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Abre una cuenta para cargar productos a esta mesa.
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={() => void onOpenTable()}
                loading={opening}
                data-test-id="waiter-open-table"
              >
                Abrir mesa
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground" data-test-id="waiter-open-table-disabled">
              Esta sucursal no permite abrir mesas desde el mesero. Abrila desde el POS o
              habilitá el canal en Configuración KaiFood.
            </p>
          )}
        </div>
      </div>
    );
  }

  const statusLabel = ORDER_STATUS_LABEL[order.status] ?? order.status;
  const isBilling = order.status === "BILLING";
  const badgeValue =
    draftCount > 0 ? draftCount : lineCount > 99 ? "99+" : lineCount;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3"
      data-test-id="waiter-table-screen"
    >
      <div className="sticky top-0 z-10 -mx-1 flex shrink-0 flex-col gap-2 bg-background px-1 pb-1">
        <div className="flex items-center gap-2">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="md"
            onClick={onBack}
            ariaLabel="Volver a Mesas"
            data-test-id="waiter-table-back"
          />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onBack}
              className="text-left text-xs font-medium text-primary"
              data-test-id="waiter-back-to-mesas"
            >
              Volver a Mesas
            </button>
            <h1 className="truncate text-lg font-semibold text-foreground">
              {order.displayLabel || `Mesa ${tableTitle}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              Estado:{" "}
              <span
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                data-test-id="waiter-order-status-badge"
              >
                {statusLabel}
              </span>
            </p>
          </div>
        </div>

        {isBilling ? (
          <p
            className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground"
            data-test-id="waiter-billing-banner"
          >
            Cuenta pedida. Si agregás ítems desde Menú, la comanda se reabre.
          </p>
        ) : null}

        <div
          className="flex shrink-0 rounded-lg border border-border bg-muted/30 p-1"
          role="tablist"
          aria-label="Menú o cuenta"
          data-test-id="waiter-panel-toggle"
        >
          <button
            type="button"
            role="tab"
            aria-selected={panel === "menu"}
            className={`flex min-h-10 flex-1 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors ${
              panel === "menu"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => setPanel("menu")}
            data-test-id="waiter-tab-menu"
          >
            Menú
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === "cuenta"}
            aria-label={
              lineCount > 0 ? `Cuenta, ${lineCount} ítems` : "Cuenta"
            }
            className={`relative flex min-h-10 flex-1 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors ${
              panel === "cuenta"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => setPanel("cuenta")}
            data-test-id="waiter-tab-cuenta"
          >
            Cuenta
            {lineCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-primary">
                {badgeValue}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {panel === "menu" ? (
        <WaiterMenuPanel
          session={session}
          branchId={branchId}
          orderId={order.id}
          onOrderUpdated={onOrderUpdated}
        />
      ) : (
        <WaiterCuentaPanel
          session={session}
          branchId={branchId}
          order={order}
          onOrderUpdated={onOrderUpdated}
        />
      )}
    </div>
  );
}
