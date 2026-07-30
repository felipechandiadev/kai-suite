"use client";

import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { updateDeliveryOrderStatusAction } from "@/features/e-shop-delivery/actions/delivery.action";
import type { DeliveryOrderRow } from "@/features/e-shop-delivery/types/delivery.types";

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Recibido",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY_FOR_DISPATCH: "Listo reparto",
  IN_TRANSIT: "En reparto",
  DELIVERED: "Entregado",
  ISSUE: "Incidencia",
  CANCELLED: "Cancelado",
};

export function DeliveryOperationsPanel({
  board,
}: {
  board: Record<string, DeliveryOrderRow[]>;
}) {
  const router = useRouter();
  const columns = [
    "SUBMITTED",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_DISPATCH",
    "IN_TRANSIT",
    "DELIVERED",
    "ISSUE",
  ] as const;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tablero operativo de pedidos con reparto local. Avanza estados según preparación y despacho.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {columns.map((status) => (
          <div key={status} className="rounded-xl border border-border p-3">
            <h3 className="mb-2 text-sm font-semibold">{STATUS_LABELS[status] ?? status}</h3>
            <ul className="space-y-2">
              {(board[status] ?? []).map((o) => (
                <li key={o.id} className="rounded-lg bg-muted/40 p-2 text-sm">
                  <p className="font-medium">{o.customerName ?? "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.commune ?? "—"} · ${Number(o.shippingFee).toLocaleString("es-CL")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {status === "CONFIRMED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          void updateDeliveryOrderStatusAction(o.id, "PREPARING").then(() =>
                            router.refresh(),
                          )
                        }
                      >
                        Preparar
                      </Button>
                    ) : null}
                    {status === "PREPARING" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          void updateDeliveryOrderStatusAction(o.id, "READY_FOR_DISPATCH").then(
                            () => router.refresh(),
                          )
                        }
                      >
                        Listo reparto
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
