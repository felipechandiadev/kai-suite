"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Select, type Option } from "@kai/ui";
import { getRecipeCtpDetailAction } from "@/features/recipes/actions/recipe.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import type { RecipeCtpDetail } from "@/features/recipes/types/recipe-ctp.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";

type Props = {
  variantId: string;
  refreshKey?: number;
};

function formatQty(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "");
}

function reasonMessage(detail: RecipeCtpDetail): string | null {
  switch (detail.reason) {
    case "NO_ROUTING":
      return "Sin unidad de producción asignada en esta sucursal.";
    case "NO_RECIPE":
      return "Sin receta activa para esta variante.";
    case "NO_STORAGE":
      return "La unidad de producción no tiene bodega de insumos configurada.";
    case "NO_LIMITING_LINES":
      return "Ningún insumo limita la capacidad producible.";
    default:
      return null;
  }
}

export function VariantDetailCtpBlock({ variantId, refreshKey = 0 }: Props) {
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [branchId, setBranchId] = useState("");
  const [detail, setDetail] = useState<RecipeCtpDetail | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listBranchesForSettingsPage()
      .then((list) => {
        if (cancelled) return;
        setBranches(list);
        setBranchId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar las sucursales");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const branchOptions: Option[] = useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.name })),
    [branches],
  );

  useEffect(() => {
    let cancelled = false;
    void loadDetail();
    return () => {
      cancelled = true;
    };
    async function loadDetail() {
      if (!branchId) {
        setDetail(null);
        setInitialLoading(false);
        setRefreshing(false);
        return;
      }
      setRefreshing(true);
      setError(null);
      const res = await getRecipeCtpDetailAction({ variantId, branchId });
      if (cancelled) return;
      setRefreshing(false);
      setInitialLoading(false);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setDetail(res.detail);
    }
  }, [variantId, branchId, refreshKey]);

  const limitingLines = useMemo(
    () => detail?.lines.filter((l) => l.lineCapacity != null) ?? [],
    [detail],
  );

  const reason = detail ? reasonMessage(detail) : null;
  const showQty = detail?.producibleQty != null;

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-muted/10 p-4"
      data-test-id="pv-detail-ctp-block"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Capacidad producible</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Unidades preparables según insumos disponibles en la bodega de la unidad de producción.
          </p>
        </div>
        {branchOptions.length > 0 ? (
          <div className="w-full shrink-0 sm:w-56">
            <Select
              label="Sucursal"
              value={branchId || null}
              onChange={(v) => setBranchId(v ? String(v) : "")}
              options={branchOptions}
              density="compact"
              data-test-id="pv-detail-ctp-branch"
            />
          </div>
        ) : null}
      </div>

      {initialLoading && !detail ? (
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

      {detail ? (
        <div
          className={`relative min-h-22 space-y-2 transition-opacity duration-150 ${
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
          {detail.productionUnitName || detail.inputStorageName ? (
            <p className="text-xs text-muted-foreground">
              {detail.productionUnitName ? (
                <span>
                  UP: <span className="text-foreground">{detail.productionUnitName}</span>
                </span>
              ) : null}
              {detail.productionUnitName && detail.inputStorageName ? " · " : null}
              {detail.inputStorageName ? (
                <span>
                  Bodega: <span className="text-foreground">{detail.inputStorageName}</span>
                </span>
              ) : null}
            </p>
          ) : null}

          {showQty ? (
            <p className="text-2xl font-semibold tabular-nums text-foreground" data-test-id="pv-detail-ctp-qty">
              {detail.producibleQty}{" "}
              <span className="text-base font-normal text-muted-foreground">unidades</span>
            </p>
          ) : reason ? (
            <p className="text-sm text-muted-foreground" data-test-id="pv-detail-ctp-reason">
              {reason}
              {detail.reason === "NO_ROUTING" ? (
                <>
                  {" "}
                  <Link href="#produccion" className="text-primary underline-offset-2 hover:underline">
                    Ir a Producción
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          {limitingLines.length > 0 ? (
            <div>
              <button
                type="button"
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                data-test-id="pv-detail-ctp-toggle-breakdown"
              >
                {expanded ? "▾ Ocultar desglose" : "▸ Ver desglose por insumo"}
              </button>
              {expanded ? (
                <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
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
                            data-test-id={`pv-detail-ctp-line-${line.inputVariantId}`}
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
      ) : null}
    </section>
  );
}
