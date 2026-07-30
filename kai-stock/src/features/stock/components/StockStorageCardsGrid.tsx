"use client";

import { useMemo } from "react";
import type { StockGridRow, StockStorageBreakdownRow } from "../types/stock-grid.types";
import type { StorageListItem } from "@/features/stock/types/storage-list.types";
import { mergeStoragesWithBreakdown } from "../lib/merge-storages-with-breakdown";
import { stockUnitDiffersFromSale, unitLabelSymbol } from "../lib/stock-unit-display";
import { StockStorageCard, type StockStorageCardActions } from "./StockStorageCard";

export type StockStorageCardsGridProps = {
  row: StockGridRow;
  storages: StorageListItem[];
  breakdown?: StockStorageBreakdownRow[];
  branchId?: string;
  filterStorageId?: string;
  interactive?: boolean;
  actions?: StockStorageCardActions;
  showHeader?: boolean;
  emptyMessage?: string;
  className?: string;
  "data-test-id"?: string;
};

export function StockStorageCardsGrid({
  row,
  storages,
  breakdown,
  branchId,
  filterStorageId,
  interactive = true,
  actions,
  showHeader = true,
  emptyMessage = "No hay almacenes configurados.",
  className,
  "data-test-id": dataTestId,
}: StockStorageCardsGridProps) {
  const cards = useMemo(() => {
    const merged = mergeStoragesWithBreakdown(
      storages,
      breakdown ?? row.storageBreakdown ?? [],
      branchId,
    );
    const sid = filterStorageId?.trim();
    if (!sid) {
      return merged;
    }
    return merged.filter((b) => b.storageId === sid);
  }, [storages, breakdown, row.storageBreakdown, branchId, filterStorageId]);

  const stockSym = unitLabelSymbol(row, "stock");
  const saleSym = unitLabelSymbol(row, "sale");
  const dualUnits = stockUnitDiffersFromSale(row) && stockSym && saleSym;

  return (
    <div className={className} data-test-id={dataTestId}>
      {showHeader ? (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Stock por almacén
          </p>
          {dualUnits ? (
            <p className="text-xs text-muted-foreground" data-test-id={`${dataTestId}-uom`}>
              Cantidades en{" "}
              <span className="font-mono font-medium text-foreground">{stockSym}</span>
              {" / "}
              <span className="font-mono font-medium text-foreground">{saleSym}</span>
            </p>
          ) : null}
        </div>
      ) : null}
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="flex w-full flex-col gap-3">
          {cards.map((b) => (
            <StockStorageCard
              key={b.storageId}
              row={row}
              breakdown={b}
              interactive={interactive}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
