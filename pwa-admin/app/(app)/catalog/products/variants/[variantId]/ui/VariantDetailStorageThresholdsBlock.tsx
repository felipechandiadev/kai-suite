"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import Badge from "@kai/ui";
import type { StockStorageBreakdownRow } from "@/features/inventory-stock/types/stock-grid.types";
import {
  StorageThresholdField,
} from "@/features/inventory-stock/components/VariantStockThresholdFields";
import type {
  StorageThresholdDraft,
  VariantThresholdDraft,
} from "@/features/inventory-stock/lib/variant-stock-threshold-config";
import { fetchVariantStockBreakdownAction } from "@/features/inventory-stock/actions/stock.action";

function formatThreshold(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) {
    return "—";
  }
  return String(Math.max(0, Math.round(Number(n))));
}

function ThresholdReadBadge({
  abbr,
  label,
  value,
  enabled,
  dataTestId,
}: {
  abbr: string;
  label: string;
  value: number | null | undefined;
  enabled?: boolean;
  dataTestId?: string;
}) {
  const display = enabled === true ? formatThreshold(value) : "—";
  return (
    <span data-test-id={dataTestId} title={`${label}: ${enabled === true ? display : "deshabilitado"}`}>
      <Badge
        variant="secondary-outlined"
        className="!inline-flex !items-center !gap-1.5 !px-1.5 !py-0 text-[10px] font-medium leading-5 tabular-nums"
      >
        <span className="text-muted-foreground">{abbr}</span>
        <span className="font-mono text-foreground">{display}</span>
      </Badge>
    </span>
  );
}

type Props = {
  variantId: string;
  sku: string;
  editing: boolean;
  minimumDraft: VariantThresholdDraft;
  maximumDraft: VariantThresholdDraft;
  reorderDraft: VariantThresholdDraft;
  storageDrafts: StorageThresholdDraft[];
  onStorageDraftsChange: (next: StorageThresholdDraft[]) => void;
  reloadKey?: number;
};

export function VariantDetailStorageThresholdsBlock({
  variantId,
  sku,
  editing,
  minimumDraft,
  maximumDraft,
  reorderDraft,
  storageDrafts,
  onStorageDraftsChange,
  reloadKey = 0,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<StockStorageBreakdownRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      const r = await fetchVariantStockBreakdownAction({ variantId, sku });
      if (cancelled) {
        return;
      }
      if (!r.ok) {
        setLoadError(r.error);
        setBreakdown([]);
      } else {
        setBreakdown(r.breakdown);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [variantId, sku, reloadKey]);

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4" data-test-id="pv-section-inventory-storages">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Configuración por almacén
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Umbrales opcionales por almacén; si no se definen, se heredan los de la variante.
        </p>
      </div>

      {loadError ? <p className="text-xs text-destructive">{loadError}</p> : null}
      {loading ? (
        <LoadingState className="flex items-center justify-center py-4" label="Cargando almacenes" size={12} />
      ) : editing ? (
        storageDrafts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay almacenes activos.</p>
        ) : (
        <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
          {storageDrafts.map((s, idx) => (
            <div
              key={s.storageId}
              className="rounded-lg border border-border bg-muted/20 p-3"
              data-test-id={`pv-inv-storage-${s.storageId}`}
            >
              <p className="mb-2 text-sm font-medium text-foreground">{s.storageName}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StorageThresholdField
                  label="Mín."
                  name={`pv-st-min-${s.storageId}`}
                  draft={s.minimum}
                  variantDraft={minimumDraft}
                  onChange={(next) => {
                    onStorageDraftsChange(
                      storageDrafts.map((x, i) => (i === idx ? { ...x, minimum: next } : x)),
                    );
                  }}
                  dataTestId={`pv-st-min-${s.storageId}`}
                />
                <StorageThresholdField
                  label="Máx."
                  name={`pv-st-max-${s.storageId}`}
                  draft={s.maximum}
                  variantDraft={maximumDraft}
                  onChange={(next) => {
                    onStorageDraftsChange(
                      storageDrafts.map((x, i) => (i === idx ? { ...x, maximum: next } : x)),
                    );
                  }}
                  dataTestId={`pv-st-max-${s.storageId}`}
                />
                <StorageThresholdField
                  label="Repos."
                  name={`pv-st-reorder-${s.storageId}`}
                  draft={s.reorder}
                  variantDraft={reorderDraft}
                  onChange={(next) => {
                    onStorageDraftsChange(
                      storageDrafts.map((x, i) => (i === idx ? { ...x, reorder: next } : x)),
                    );
                  }}
                  dataTestId={`pv-st-reorder-${s.storageId}`}
                />
              </div>
            </div>
          ))}
        </div>
        )
      ) : breakdown.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay almacenes activos.</p>
      ) : (
        <div className="space-y-2">
          {breakdown.map((b) => {
            const title = [b.storageName, b.branchName].filter(Boolean).join(" · ");
            return (
              <div
                key={b.storageId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/15 px-3 py-2"
                data-test-id={`pv-inv-storage-ro-${b.storageId}`}
              >
                <p className="min-w-0 text-sm font-medium text-foreground" title={title}>
                  {b.storageName}
                  {b.branchName ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">({b.branchName})</span>
                  ) : null}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <ThresholdReadBadge
                    abbr="Mín"
                    label="Mínimo"
                    value={b.effectiveMinimumStock}
                    enabled={b.effectiveMinimumStockEnabled}
                    dataTestId={`pv-inv-threshold-min-${b.storageId}`}
                  />
                  <ThresholdReadBadge
                    abbr="Máx"
                    label="Máximo"
                    value={b.effectiveMaximumStock}
                    enabled={b.effectiveMaximumStockEnabled}
                    dataTestId={`pv-inv-threshold-max-${b.storageId}`}
                  />
                  <ThresholdReadBadge
                    abbr="Rep"
                    label="Punto de reposición"
                    value={b.effectiveReorderPoint}
                    enabled={b.effectiveReorderPointEnabled}
                    dataTestId={`pv-inv-threshold-rep-${b.storageId}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
