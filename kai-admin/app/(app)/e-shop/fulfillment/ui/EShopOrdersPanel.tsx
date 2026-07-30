"use client";

import { useState } from "react";
import { Button } from "@kai/ui";
import type { EShopOrderListRow } from "@/features/e-shop-fulfillment/types/eshop-fulfillment.types";
import { FULFILLMENT_STATUS_LABELS } from "@/features/e-shop-fulfillment/lib/eshop-fulfillment-labels";
import { EShopOrderDetailDialog } from "./EShopOrderDetailDialog";

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function EShopOrdersPanel({
  rows,
  total,
}: {
  rows: EShopOrderListRow[];
  total: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{total} pedido(s) web</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Entrega</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No hay pedidos web.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.documentNumber}
                    {row.isLegacy ? (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">Legacy</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div>{row.customerName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{row.customerEmail}</div>
                  </td>
                  <td className="px-3 py-2">
                    {FULFILLMENT_STATUS_LABELS[row.fulfillmentStatus] ?? row.fulfillmentStatus}
                  </td>
                  <td className="px-3 py-2">{row.fulfillmentMethodName ?? "—"}</td>
                  <td className="px-3 py-2">{fmtMoney(row.total)}</td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(row.id)}>
                      Ver
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedId ? (
        <EShopOrderDetailDialog orderId={selectedId} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}
