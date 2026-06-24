"use client";

import type { ReceptionLineForReturn } from "@/features/receptions/types/reception.types";
import type { PurchasingTransactionDetailLine } from "../types/purchasing-detail.types";
import { formatQty } from "@/features/inventory-stock/lib/stock-unit-display";

export type PurchasingLineRow = {
  key: string;
  productName: string;
  sku?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  storagePhysicalBefore?: number | null;
  storagePhysicalAfter?: number | null;
  stockUnitLabel?: string | null;
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function receptionLinesToRows(lines: ReceptionLineForReturn[]): PurchasingLineRow[] {
  return lines.map((l) => {
    const qty = Number(l.receivedQuantity ?? l.quantity) || 0;
    const unit = Number(l.unitPrice) || 0;
    return {
      key: l.id,
      productName: l.productName,
      sku: l.sku,
      variantName: l.variantName,
      quantity: qty,
      unitPrice: unit,
      lineTotal: qty * unit,
      storagePhysicalBefore:
        l.storagePhysicalBefore != null && Number.isFinite(Number(l.storagePhysicalBefore))
          ? Number(l.storagePhysicalBefore)
          : null,
      storagePhysicalAfter:
        l.storagePhysicalAfter != null && Number.isFinite(Number(l.storagePhysicalAfter))
          ? Number(l.storagePhysicalAfter)
          : null,
      stockUnitLabel: l.stockUnitLabel?.trim() || null,
    };
  });
}

export function transactionLinesToRows(
  lines: PurchasingTransactionDetailLine[],
): PurchasingLineRow[] {
  return lines.map((l) => ({
    key: l.id,
    productName: l.productName,
    sku: l.productSku,
    variantName: l.variantName,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.subtotal > 0 ? l.subtotal : l.total,
  }));
}

function formatStockQty(value: number | null | undefined, unitLabel?: string | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  const qty = formatQty(value);
  const unit = unitLabel?.trim();
  return unit ? `${qty} ${unit}` : qty;
}

type Props = {
  rows: PurchasingLineRow[];
  emptyMessage?: string;
  /** Muestra columnas de stock anterior / nuevo (detalle de recepción). */
  showStockImpact?: boolean;
};

export default function PurchasingProductLinesTable({
  rows,
  emptyMessage = "Sin líneas de producto.",
  showStockImpact = false,
}: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className={`w-full text-sm ${showStockImpact ? "min-w-[680px]" : "min-w-[520px]"}`}>
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Producto</th>
            <th className="px-3 py-2 font-medium">SKU</th>
            {showStockImpact ? (
              <>
                <th className="px-3 py-2 text-right font-medium">Stock ant.</th>
                <th className="px-3 py-2 text-right font-medium">Cant.</th>
                <th className="px-3 py-2 text-right font-medium">Stock nuevo</th>
              </>
            ) : (
              <th className="px-3 py-2 text-right font-medium">Cant.</th>
            )}
            <th className="px-3 py-2 text-right font-medium">P. unit.</th>
            <th className="px-3 py-2 text-right font-medium">Total línea</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 text-foreground">
                <div className="font-medium">{row.productName}</div>
                {row.variantName ? (
                  <div className="text-xs text-muted-foreground">{row.variantName}</div>
                ) : null}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {row.sku || "—"}
              </td>
              {showStockImpact ? (
                <>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatStockQty(row.storagePhysicalBefore, row.stockUnitLabel)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                    {formatStockQty(row.storagePhysicalAfter, row.stockUnitLabel)}
                  </td>
                </>
              ) : (
                <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
              )}
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.unitPrice)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                {formatMoney(row.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
