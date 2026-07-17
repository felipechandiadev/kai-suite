"use client";

import { useState } from "react";
import { Button, IconButton } from "@kai/ui";
import type {
  DiningOrderDto,
  DiningTableDto,
} from "../infrastructure/dining.request";
import { WaiterMenuPanel } from "./WaiterMenuPanel";
import { WaiterMesaPanel } from "./WaiterMesaPanel";
import type { WaiterSession } from "@/lib/app-session";

type TablePanel = "menu" | "mesa";

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
  table: DiningTableDto;
  order: DiningOrderDto | null;
  onBack: () => void;
  onOpenTable: () => Promise<void>;
  onOrderUpdated: (order: DiningOrderDto) => void;
  opening?: boolean;
};

export function WaiterTableScreen({
  session,
  table,
  order,
  onBack,
  onOpenTable,
  onOrderUpdated,
  opening = false,
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
            ariaLabel="Volver al salón"
            data-test-id="waiter-table-back"
          />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground">
              Mesa {tableTitle}
            </h1>
            <p className="text-xs text-muted-foreground">Sin cuenta abierta</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center">
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
        </div>
      </div>
    );
  }

  const statusLabel = ORDER_STATUS_LABEL[order.status] ?? order.status;
  const isBilling = order.status === "BILLING";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3"
      data-test-id="waiter-table-screen"
    >
      <div className="flex shrink-0 items-center gap-2">
        <IconButton
          icon="ArrowLeft"
          variant="action"
          size="md"
          onClick={onBack}
          ariaLabel="Volver al salón"
          data-test-id="waiter-table-back"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {order.displayLabel || `Mesa ${tableTitle}`}
          </h1>
          <p className="text-xs text-muted-foreground">
            Estado:{" "}
            <span className="font-medium text-foreground">{statusLabel}</span>
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
        aria-label="Vista de la mesa"
      >
        <button
          type="button"
          role="tab"
          aria-selected={panel === "menu"}
          className={`flex min-h-[36px] flex-1 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
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
          aria-selected={panel === "mesa"}
          aria-label={lineCount > 0 ? `Mesa, ${lineCount} ítems` : "Mesa"}
          className={`relative flex min-h-[36px] flex-1 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
            panel === "mesa"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
          onClick={() => setPanel("mesa")}
          data-test-id="waiter-tab-mesa"
        >
          Mesa
          {lineCount > 0 ? (
            <span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-primary">
              {draftCount > 0 ? draftCount : lineCount > 99 ? "99+" : lineCount}
            </span>
          ) : null}
        </button>
      </div>

      {panel === "menu" ? (
        <WaiterMenuPanel
          session={session}
          orderId={order.id}
          onOrderUpdated={onOrderUpdated}
        />
      ) : (
        <WaiterMesaPanel
          session={session}
          order={order}
          onOrderUpdated={onOrderUpdated}
        />
      )}
    </div>
  );
}
