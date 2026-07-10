"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import {
  fetchVariantStockBalanceChartAction,
  fetchVariantStockBreakdownAction,
} from "@/features/inventory-stock/actions/stock.action";
import type {
  StockBalanceChartMeta,
  StockBalanceChartSeriesLine,
} from "@/features/inventory-stock/lib/variant-stock-balance-chart";
import type { StockGridRow, StockStorageBreakdownRow } from "@/features/inventory-stock/types/stock-grid.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { StockStorageCardsGrid } from "@/features/inventory-stock/components/StockStorageCardsGrid";
import { useStockStorageOperations } from "@/features/inventory-stock/components/useStockStorageOperations";
import { StockReservationsDialog } from "@/features/inventory-stock/components/StockReservationsDialog";
import { VariantStockBalanceByStorageChart } from "./VariantStockBalanceByStorageChart";

type Props = {
  variant: ProductVariantGridRow;
  onStockChanged?: () => void;
};

type LoadOptions = {
  /** No sustituye cards/gráfico por el mensaje de carga (evita salto de scroll). */
  silent?: boolean;
  /** Solo fila de inventario + desglose; sin movimientos ni gráfico. */
  cardsOnly?: boolean;
};

export function VariantDetailStockByStorageSection({ variant, onStockChanged }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockRow, setStockRow] = useState<StockGridRow | null>(null);
  const [storages, setStorages] = useState<StorageListItem[]>([]);
  const [breakdown, setBreakdown] = useState<StockStorageBreakdownRow[]>([]);
  const [seriesLines, setSeriesLines] = useState<StockBalanceChartSeriesLine[]>([]);
  const [meta, setMeta] = useState<StockBalanceChartMeta | null>(null);
  const [unitLabel, setUnitLabel] = useState<string | null>(null);
  const [reservationsRow, setReservationsRow] = useState<StockGridRow | null>(null);
  const [reservationsStorage, setReservationsStorage] = useState<StockStorageBreakdownRow | null>(null);
  const chartRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const refreshChartSilent = useCallback(async () => {
    const id = variant.id?.trim() ?? "";
    const sku = variant.sku?.trim() ?? "";
    if (!id) {
      return;
    }
    const r = await fetchVariantStockBalanceChartAction({ variantId: id, sku });
    if (!r.ok) {
      return;
    }
    setSeriesLines(r.data.seriesLines);
    setMeta(r.data.meta);
    setUnitLabel(
      r.data.unitLabel ?? variant.stockBaseUnitLabel?.trim() ?? variant.unitOfMeasure?.trim() ?? null,
    );
    if (r.data.storages.length > 0) {
      setStorages(r.data.storages);
    }
    applyCardsSnapshot(r.data.stockRow, r.data.breakdown);
  }, [variant.id, variant.sku, variant.stockBaseUnitLabel, variant.unitOfMeasure, applyCardsSnapshot]);

  const scheduleChartRefresh = useCallback(() => {
    if (chartRefreshTimer.current) {
      clearTimeout(chartRefreshTimer.current);
    }
    chartRefreshTimer.current = setTimeout(() => {
      void refreshChartSilent();
    }, 600);
  }, [refreshChartSilent]);

  useEffect(() => {
    return () => {
      if (chartRefreshTimer.current) {
        clearTimeout(chartRefreshTimer.current);
      }
    };
  }, []);

  const load = useCallback(
    async (opts: LoadOptions = {}) => {
      const id = variant.id?.trim() ?? "";
      const sku = variant.sku?.trim() ?? "";
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

      if (opts.cardsOnly) {
        const r = await fetchVariantStockBreakdownAction({ variantId: id, sku });
        if (!r.ok) {
          setError(r.error);
          if (!opts.silent) {
            setLoading(false);
          }
          return;
        }
        applyCardsSnapshot(r.stockRow, r.breakdown);
        if (!opts.silent) {
          setLoading(false);
        }
        return;
      }

      const r = await fetchVariantStockBalanceChartAction({ variantId: id, sku });
      if (!r.ok) {
        setError(r.error);
        setStockRow(null);
        setStorages([]);
        setBreakdown([]);
        setSeriesLines([]);
        setMeta(null);
        if (!opts.silent) {
          setLoading(false);
        }
        return;
      }
      setStorages(r.data.storages);
      applyCardsSnapshot(r.data.stockRow, r.data.breakdown);
      setSeriesLines(r.data.seriesLines);
      setMeta(r.data.meta);
      setUnitLabel(
        r.data.unitLabel ?? variant.stockBaseUnitLabel?.trim() ?? variant.unitOfMeasure?.trim() ?? null,
      );
      if (!opts.silent) {
        setLoading(false);
      }
    },
    [variant.id, variant.sku, variant.stockBaseUnitLabel, variant.unitOfMeasure, applyCardsSnapshot],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const reloadAfterStockOp = useCallback(async () => {
    await load({ silent: true, cardsOnly: true });
    scheduleChartRefresh();
    onStockChanged?.();
  }, [load, scheduleChartRefresh, onStockChanged]);

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
    <section
      className="space-y-4 rounded-lg border border-border bg-background p-4"
      data-test-id="pv-section-stock-by-storage"
    >
      <h2 className="text-sm font-semibold text-foreground">Stock por almacén</h2>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {stockOps.inlineError}
      {loading ? (
        <LoadingState className="flex items-center justify-center py-4" label="Cargando stock" />
      ) : (
        <>
          <VariantStockBalanceByStorageChart
            seriesLines={seriesLines}
            meta={meta}
            unitLabel={unitLabel}
          />

          {stockRow ? (
            <StockStorageCardsGrid
              row={stockRow}
              storages={storages}
              breakdown={breakdown}
              interactive
              actions={cardActions}
              showHeader={false}
              className="border-t border-border pt-4"
              data-test-id={`pv-stock-cards-${stockRow.variantId}`}
            />
          ) : (
            <p className="text-sm text-muted-foreground border-t border-border pt-4">
              No se encontró la variante en el inventario.
            </p>
          )}
        </>
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
