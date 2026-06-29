"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchVariantStockBreakdownAction } from "@/features/stock/actions/stock.action";
import { StockStorageCardsGrid } from "@/features/stock/components/StockStorageCardsGrid";
import { useStockStorageOperations } from "@/features/stock/components/useStockStorageOperations";
import { StockReservationsDialog } from "@/features/stock/components/StockReservationsDialog";
import type { StockGridRow, StockStorageBreakdownRow } from "@/features/stock/types/stock-grid.types";
import type { StorageListItem } from "@/features/stock/types/storage-list.types";

type Props = {
  variantId: string;
  sku: string;
  reloadKey?: number;
  onStockChanged?: () => void;
};

export function VariantDetailStockByStorageSection({
  variantId,
  sku,
  reloadKey = 0,
  onStockChanged,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockRow, setStockRow] = useState<StockGridRow | null>(null);
  const [storages, setStorages] = useState<StorageListItem[]>([]);
  const [breakdown, setBreakdown] = useState<StockStorageBreakdownRow[]>([]);
  const [reservationsRow, setReservationsRow] = useState<StockGridRow | null>(null);
  const [reservationsStorage, setReservationsStorage] = useState<StockStorageBreakdownRow | null>(null);

  const applyCardsSnapshot = useCallback(
    (row: StockGridRow | null, nextBreakdown: StockStorageBreakdownRow[]) => {
      setBreakdown(nextBreakdown);
      if (!row) {
        setStockRow(null);
        return;
      }
      setStockRow({ ...row, storageBreakdown: nextBreakdown });
    },
    [],
  );

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const id = variantId.trim();
      const resolvedSku = sku.trim();
      if (!id) {
        if (!opts.silent) {
          setLoading(false);
        }
        return;
      }
      if (!opts.silent) {
        setLoading(true);
        setError(null);
      }

      const r = await fetchVariantStockBreakdownAction({ variantId: id, sku: resolvedSku });
      if (!r.ok) {
        setError(r.error);
        setStockRow(null);
        setStorages([]);
        setBreakdown([]);
        if (!opts.silent) {
          setLoading(false);
        }
        return;
      }
      setStorages(r.storages);
      applyCardsSnapshot(r.stockRow, r.breakdown);
      if (!opts.silent) {
        setLoading(false);
      }
    },
    [variantId, sku, applyCardsSnapshot],
  );

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const reloadAfterStockOp = useCallback(async () => {
    await load({ silent: true });
    onStockChanged?.();
  }, [load, onStockChanged]);

  const stockOps = useStockStorageOperations({
    rows: stockRow ? [stockRow] : [],
    storages,
    onAfterSuccess: reloadAfterStockOp,
    persistCountUnitPreference: false,
  });

  const cardActions = stockOps.bindCardActions((r, b) => {
    setReservationsRow(r);
    setReservationsStorage(b);
  });

  return (
    <section className="flex flex-col gap-3" data-test-id="variant-stock-by-storage">
      <h2 className="text-sm font-semibold text-foreground">Stock por almacén</h2>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {stockOps.inlineError}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando stock…</p>
      ) : stockRow ? (
        <StockStorageCardsGrid
          row={stockRow}
          storages={storages}
          breakdown={breakdown}
          interactive
          actions={cardActions}
          showHeader={false}
          data-test-id={`variant-stock-cards-${stockRow.variantId}`}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No se encontró la variante en el inventario.
        </p>
      )}

      {stockOps.operationDialogs}

      <StockReservationsDialog
        open={reservationsRow != null && reservationsStorage != null}
        row={reservationsRow}
        storage={reservationsStorage}
        onClose={() => {
          setReservationsRow(null);
          setReservationsStorage(null);
        }}
      />
    </section>
  );
}
