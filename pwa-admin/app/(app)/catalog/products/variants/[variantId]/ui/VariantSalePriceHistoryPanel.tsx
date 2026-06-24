"use client";

import LoadingState from "@/shared/components/LoadingState";
import type { VariantSalePriceHistoryEntry } from "@/features/inventory-products/types/variant-sale-price-history.types";
import { VariantSalePriceHistoryChart } from "./VariantSalePriceHistoryChart";

type VariantSalePriceHistoryPanelProps = {
  items: VariantSalePriceHistoryEntry[];
  loading: boolean;
  error: string | null;
  formatMoney: (amount: number, currency: string) => string;
};

function formatWhen(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) {
    return at;
  }
  return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function userLabel(e: VariantSalePriceHistoryEntry): string {
  return e.userDisplayName?.trim() || "—";
}

function listLabel(e: VariantSalePriceHistoryEntry): string {
  if (e.priceListId) {
    return e.priceListName?.trim() || "Lista de precios";
  }
  if (e.previousBasePrice != null || e.newBasePrice != null) {
    return "Precio referencia";
  }
  return "—";
}

function PriceChangeCell({
  prev,
  next,
  formatMoney,
}: {
  prev?: number;
  next?: number;
  formatMoney: (amount: number, currency: string) => string;
}) {
  if (prev == null && next == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="tabular-nums text-foreground">
      <span>{prev != null ? formatMoney(prev, "CLP") : "—"}</span>
      <span className="mx-1 text-muted-foreground">→</span>
      <span>{next != null ? formatMoney(next, "CLP") : "—"}</span>
    </span>
  );
}

export function VariantSalePriceHistoryPanel({
  items,
  loading,
  error,
  formatMoney,
}: VariantSalePriceHistoryPanelProps) {
  return (
    <div data-test-id="pv-sale-price-history">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Historial de precios de venta
      </p>
      {loading ? (
        <LoadingState className="flex items-center justify-center mt-2" label="Cargando historial" size={12} />
      ) : error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Sin cambios registrados aún.</p>
      ) : (
        <>
          <VariantSalePriceHistoryChart items={items} formatMoney={formatMoney} />
          <div className="mt-3 max-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full min-w-[36rem] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-background text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="whitespace-nowrap px-3 py-2">Fecha</th>
                  <th className="whitespace-nowrap px-3 py-2">Usuario</th>
                  <th className="whitespace-nowrap px-3 py-2">Lista</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">Neto</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">Con impuestos</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e, idx) => (
                  <tr
                    key={`${e.at}-${e.priceListId ?? "base"}-${idx}`}
                    className="border-b border-border last:border-b-0 odd:bg-background even:bg-muted/15"
                    data-test-id={`pv-sale-price-history-row-${idx}`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatWhen(e.at)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{userLabel(e)}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{listLabel(e)}</td>
                    <td className="px-3 py-2 text-right">
                      <PriceChangeCell
                        prev={e.priceListId ? e.previousNet : e.previousBasePrice}
                        next={e.priceListId ? e.newNet : e.newBasePrice}
                        formatMoney={formatMoney}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <PriceChangeCell
                        prev={e.priceListId ? e.previousGross : undefined}
                        next={e.priceListId ? e.newGross : undefined}
                        formatMoney={formatMoney}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
