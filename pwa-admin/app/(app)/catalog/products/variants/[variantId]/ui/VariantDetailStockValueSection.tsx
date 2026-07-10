"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import { fetchVariantStockBreakdownAction } from "@/features/inventory-stock/actions/stock.action";
import { formatQty, formatStockSlashPair } from "@/features/inventory-stock/lib/stock-unit-display";
import type { StockGridRow, StockStorageBreakdownRow } from "@/features/inventory-stock/types/stock-grid.types";

type Props = {
  variant: ProductVariantGridRow;
  /** Incrementar tras operaciones de stock (p. ej. cards por almacén). */
  refreshKey?: number;
};

function formatMoney(n: number): string {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  } catch {
    return String(Math.round(n));
  }
}

function storagePmpValue(qty: number, pmp: number | null | undefined): number | null {
  if (pmp == null || !Number.isFinite(pmp)) {
    return null;
  }
  return Number((Math.max(0, qty) * pmp).toFixed(2));
}

function storageLabel(b: StockStorageBreakdownRow): string {
  return [b.storageName, b.branchName].filter(Boolean).join(" · ");
}

function formatStockQty(
  qty: number,
  stockRow: StockGridRow | null,
  variant: ProductVariantGridRow,
): string {
  if (stockRow) {
    return formatStockSlashPair(qty, stockRow);
  }
  const unit = variant.stockBaseUnitLabel?.trim() || variant.unitOfMeasure?.trim() || "";
  return unit ? `${formatQty(qty)} ${unit}` : formatQty(qty);
}

export function VariantDetailStockValueSection({ variant, refreshKey = 0 }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockRow, setStockRow] = useState<StockGridRow | null>(null);
  const [breakdown, setBreakdown] = useState<StockStorageBreakdownRow[]>([]);

  const load = useCallback(async () => {
    const id = variant.id?.trim() ?? "";
    const sku = variant.sku?.trim() ?? "";
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const r = await fetchVariantStockBreakdownAction({ variantId: id, sku });
    if (!r.ok) {
      setError(r.error);
      setStockRow(null);
      setBreakdown([]);
      setLoading(false);
      return;
    }
    setStockRow(r.stockRow);
    setBreakdown(r.breakdown);
    setLoading(false);
  }, [variant.id, variant.sku]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // PMP: preferir dato del grid de inventario (más fresco) sobre el del catálogo
  const pmp =
    stockRow?.pmp != null && Number.isFinite(stockRow.pmp)
      ? stockRow.pmp
      : variant.pmp != null && Number.isFinite(variant.pmp)
        ? variant.pmp
        : null;

  const totalStock =
    stockRow != null
      ? stockRow.totalStock
      : breakdown.reduce((acc, b) => acc + (b.quantity || 0), 0);

  const totalValue =
    stockRow?.pmpValue != null && Number.isFinite(stockRow.pmpValue)
      ? stockRow.pmpValue
      : pmp != null
        ? storagePmpValue(totalStock, pmp)
        : null;

  const storageRows = useMemo(() => {
    // Preferir breakdown (enriquecido con catálogo de almacenes) sobre storageBreakdown del grid
    const rows = breakdown.length > 0 ? breakdown : (stockRow?.storageBreakdown ?? []);
    // Filtrar almacenes sin stock Y sin registro real (evitar filas vacías del catálogo)
    const withStock = rows.filter((b) => b.quantity > 0 || b.reservedStock > 0);
    const source = withStock.length > 0 ? withStock : rows;
    return [...source].sort((a, b) =>
      storageLabel(a).localeCompare(storageLabel(b), "es", { sensitivity: "base" }),
    );
  }, [breakdown, stockRow?.storageBreakdown]);

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-background p-4"
      data-test-id="pv-section-stock-value"
    >
      <h2 className="text-sm font-semibold text-foreground">Valor del stock</h2>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <LoadingState className="flex items-center justify-center py-4" label="Cargando valor del stock" />
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <dt className="text-xs text-muted-foreground">PMP actual</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-sm font-medium text-foreground">
                {pmp != null && Number.isFinite(pmp) ? formatMoney(pmp) : "Sin PMP"}
              </dd>
            </div>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Stock total (físico)</dt>
              <dd
                className="mt-0.5 font-mono tabular-nums text-sm font-medium text-foreground"
                data-test-id="pv-stock-value-total-qty"
              >
                {formatStockQty(totalStock, stockRow, variant)}
              </dd>
            </div>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Valor total (PMP)</dt>
              <dd
                className="mt-0.5 font-mono tabular-nums text-sm font-medium text-foreground"
                data-test-id="pv-stock-value-total-value"
              >
                {totalValue != null && Number.isFinite(totalValue) ? formatMoney(totalValue) : "Sin PMP"}
              </dd>
            </div>
          </dl>

          {storageRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin stock registrado por almacén.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Almacén</th>
                    <th className="px-3 py-2 text-right">Stock físico</th>
                    <th className="px-3 py-2 text-right">Valor (PMP)</th>
                  </tr>
                </thead>
                <tbody>
                  {storageRows.map((b) => {
                    const value = storagePmpValue(b.quantity, pmp);
                    return (
                      <tr
                        key={b.storageId}
                        className="border-b border-border last:border-b-0 odd:bg-background even:bg-muted/10"
                        data-test-id={`pv-stock-value-row-${b.storageId}`}
                      >
                        <td className="px-3 py-2 font-medium text-foreground">{storageLabel(b)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                          {formatStockQty(b.quantity, stockRow, variant)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                          {value != null ? formatMoney(value) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
