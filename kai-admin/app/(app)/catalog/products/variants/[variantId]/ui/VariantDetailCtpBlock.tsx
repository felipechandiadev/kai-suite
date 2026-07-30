"use client";

import { useEffect, useState } from "react";
import { Badge } from "@kai/ui";
import { getRecipeCtpByStorageAction } from "@/features/recipes/actions/recipe.action";
import type {
  RecipeCtpByStorage,
  RecipeCtpByStorageItem,
  RecipeCtpDetailReason,
} from "@/features/recipes/types/recipe-ctp.types";

type Props = {
  variantId: string;
  refreshKey?: number;
};

function formatQty(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "");
}

function topReasonMessage(reason: RecipeCtpDetailReason | null): string | null {
  switch (reason) {
    case "NO_ROUTING":
      return "Sin unidad de producción asignada. Asigne unidades arriba para ver capacidad por almacén.";
    case "NO_RECIPE":
      return "Sin receta activa para esta variante.";
    case "NO_STORAGE":
      return "Las unidades asignadas no tienen bodega de insumos configurada.";
    case "NO_LIMITING_LINES":
      return "Ningún insumo limita la capacidad producible.";
    default:
      return null;
  }
}

function StorageCtpRow({ item }: { item: RecipeCtpByStorageItem }) {
  const [expanded, setExpanded] = useState(false);
  const limitingLines = item.lines.filter((l) => l.lineCapacity != null);
  const label = item.storageName?.trim() || item.storageId;

  return (
    <div
      className="rounded-lg border border-border/70 bg-background/50 px-3 py-2.5"
      data-test-id={`pv-detail-ctp-storage-${item.storageId}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          {item.productionUnitNames.length > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              UP: {item.productionUnitNames.join(", ")}
            </p>
          ) : null}
        </div>
        {item.producibleQty != null ? (
          <p
            className="shrink-0 text-xl font-semibold tabular-nums text-foreground"
            data-test-id={`pv-detail-ctp-qty-${item.storageId}`}
          >
            {item.producibleQty}{" "}
            <span className="text-sm font-normal text-muted-foreground">unidades</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {topReasonMessage(item.reason) ?? "Sin capacidad calculable"}
          </p>
        )}
      </div>

      {limitingLines.length > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            data-test-id={`pv-detail-ctp-toggle-${item.storageId}`}
          >
            {expanded ? "▾ Ocultar desglose" : "▸ Ver desglose por insumo"}
          </button>
          {expanded ? (
            <div className="mt-2 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-130 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Insumo</th>
                    <th className="w-24 px-3 py-2">Consumo/u.</th>
                    <th className="w-24 px-3 py-2">Disponible</th>
                    <th className="w-24 px-3 py-2">Cap. línea</th>
                    <th className="w-20 px-3 py-2">Cuello</th>
                  </tr>
                </thead>
                <tbody>
                  {limitingLines.map((line) => {
                    const unit = line.inputStockBaseUnitLabel?.trim();
                    return (
                      <tr
                        key={line.inputVariantId}
                        className="border-b border-border/70"
                        data-test-id={`pv-detail-ctp-line-${item.storageId}-${line.inputVariantId}`}
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">
                            {line.inputProductName?.trim() || line.inputSku || line.inputVariantId}
                          </p>
                          {line.inputSku ? (
                            <p className="font-mono text-xs text-muted-foreground">{line.inputSku}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-foreground">
                          {formatQty(line.consumptionPerUnit)}
                          {unit ? <span className="ml-1 text-muted-foreground">{unit}</span> : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-foreground">
                          {formatQty(line.available)}
                          {unit ? <span className="ml-1 text-muted-foreground">{unit}</span> : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-foreground">
                          {line.lineCapacity ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          {line.isBottleneck ? (
                            <Badge variant="warning" className="text-[10px]">
                              Sí
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function VariantDetailCtpBlock({ variantId, refreshKey = 0 }: Props) {
  const [result, setResult] = useState<RecipeCtpByStorage | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void load();
    return () => {
      cancelled = true;
    };
    async function load() {
      setRefreshing(true);
      setError(null);
      const res = await getRecipeCtpByStorageAction({ variantId });
      if (cancelled) return;
      setRefreshing(false);
      setInitialLoading(false);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setResult(res.result);
    }
  }, [variantId, refreshKey]);

  const topReason = result ? topReasonMessage(result.reason) : null;

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-muted/10 p-4"
      data-test-id="pv-detail-ctp-block"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">Capacidad producible</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Unidades preparables según insumos disponibles en cada almacén de insumos de las
          unidades de producción asignadas.
        </p>
      </div>

      {initialLoading && !result ? (
        <p
          className="min-h-22 text-sm text-muted-foreground"
          data-test-id="pv-detail-ctp-loading"
        >
          Calculando capacidad…
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-error" data-test-id="pv-detail-ctp-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className={`relative min-h-14 space-y-2 transition-opacity duration-150 ${
            refreshing ? "pointer-events-none opacity-60" : "opacity-100"
          }`}
          data-test-id="pv-detail-ctp-content"
          aria-busy={refreshing}
        >
          {refreshing ? (
            <p
              className="absolute right-0 top-0 text-xs text-muted-foreground"
              data-test-id="pv-detail-ctp-refreshing"
            >
              Actualizando…
            </p>
          ) : null}

          {topReason && result.storages.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-test-id="pv-detail-ctp-reason">
              {topReason}
            </p>
          ) : null}

          {result.storages.length > 0 ? (
            <div className="flex flex-col gap-2">
              {result.storages.map((item) => (
                <StorageCtpRow key={item.storageId} item={item} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
