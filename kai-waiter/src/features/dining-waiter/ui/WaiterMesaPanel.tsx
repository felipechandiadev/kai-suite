"use client";

import { useState } from "react";
import { Button, IconButton } from "@kai/ui";
import type { DiningOrderDto } from "../infrastructure/dining.request";
import {
  requestOrderBillAction,
  sendOrderToKitchenAction,
} from "../actions/waiter.action";
import type { WaiterSession } from "@/lib/app-session";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "En cocina",
  PREPARING: "Preparando",
  READY: "Listo",
  SERVED: "Servido",
  CANCELLED: "Cancelado",
};

type WaiterMesaPanelProps = {
  session: WaiterSession;
  order: DiningOrderDto;
  onOrderUpdated: (order: DiningOrderDto) => void;
};

export function WaiterMesaPanel({
  session,
  order,
  onOrderUpdated,
}: WaiterMesaPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const auth = {
    userId: session.userId,
    companyId: session.companyId,
  };

  const lines = order.lines ?? [];
  const draftCount = lines.filter((l) => l.kitchenStatus === "DRAFT").length;

  const run = async (key: string, fn: () => Promise<DiningOrderDto>) => {
    setBusy(key);
    setError(null);
    try {
      onOrderUpdated(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en la operación");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="waiter-mesa-panel">
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {lines.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            Sin ítems. Ve a Menú para cargar productos.
          </li>
        ) : (
          lines.map((line) => {
            const isDraft = line.kitchenStatus === "DRAFT";
            const name =
              line.productVariant?.name ?? line.productVariantId.slice(0, 8);
            return (
              <li
                key={line.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5"
                data-test-id={`waiter-mesa-line-${line.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {name}{" "}
                    <span className="font-normal text-muted-foreground">
                      ×{Number(line.quantity)}
                    </span>
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {STATUS_LABEL[line.kitchenStatus] ?? line.kitchenStatus}
                  </p>
                </div>
                {isDraft ? (
                  <IconButton
                    icon="ChefHat"
                    variant="secondary"
                    size="sm"
                    isLoading={busy === `fire-${line.id}`}
                    disabled={busy !== null}
                    onClick={() =>
                      void run(`fire-${line.id}`, () =>
                        sendOrderToKitchenAction({
                          ...auth,
                          orderId: order.id,
                          lineIds: [line.id],
                        }),
                      )
                    }
                    ariaLabel="Enviar a cocina"
                    data-test-id={`waiter-fire-line-${line.id}`}
                  />
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {draftCount > 1 ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={busy === "fire-all"}
            disabled={busy !== null}
            onClick={() =>
              void run("fire-all", () =>
                sendOrderToKitchenAction({ ...auth, orderId: order.id }),
              )
            }
            data-test-id="waiter-fire-all"
          >
            Enviar {draftCount} a cocina
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outlined"
          size="sm"
          loading={busy === "bill"}
          disabled={busy !== null}
          onClick={() =>
            void run("bill", () =>
              requestOrderBillAction({ ...auth, orderId: order.id }),
            )
          }
          data-test-id="waiter-request-bill"
        >
          Pedir cuenta
        </Button>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
