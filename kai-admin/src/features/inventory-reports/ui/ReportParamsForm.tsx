"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AutoComplete, SelectDefault as Select, TextField } from "@kai/ui";
import type { ReportRegistryEntry } from "@/features/inventory-reports/types/inventory-report.types";
import {
  DATE_PRESET_OPTIONS,
  dateRangeForPreset,
  type CompareWith,
  type DatePreset,
  type ReportGranularity,
  toIsoDate,
} from "@/features/inventory-reports/lib/report-dates";
import type { ReportFormState } from "@/features/inventory-reports/lib/report-form";
import { searchProductsForPromotionAction } from "@/features/promotions/actions/search-products-for-promotion.action";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";

type ProductOpt = { id: string; label: string };

const GRANULARITY_OPTIONS: Array<{ id: ReportGranularity; label: string }> = [
  { id: "auto", label: "Automática" },
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
];

const COMPARE_OPTIONS: Array<{ id: CompareWith; label: string }> = [
  { id: "none", label: "Sin comparación" },
  { id: "previousPeriod", label: "Período anterior" },
  { id: "samePeriodLastYear", label: "Mismo lapso año pasado" },
];

type Props = {
  entry: ReportRegistryEntry;
  value: ReportFormState;
  onChange: (next: ReportFormState) => void;
  storages: StorageListItem[];
  units: UnitListItem[];
  categories: CategoryListItem[];
};

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function ReportParamsForm({
  entry,
  value,
  onChange,
  storages,
  units,
  categories,
}: Props) {
  const kinds = useMemo(() => new Set(entry.params.map((p) => p.kind)), [entry]);
  const stockUnitRequired = entry.params.some(
    (p) => p.kind === "stockUnitMulti" && p.required,
  );
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOpt[]>([]);
  const [, startTransition] = useTransition();

  const patch = useCallback(
    (partial: Partial<ReportFormState>) => onChange({ ...value, ...partial }),
    [onChange, value],
  );

  useEffect(() => {
    if (!kinds.has("product")) return;
    const q = productQuery.trim();
    if (q.length < 2) {
      setProductOptions([]);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const rows = await searchProductsForPromotionAction(q);
          setProductOptions(
            rows.map((p) => {
              const sku = p.variants?.[0]?.sku;
              return {
                id: p.id,
                label: `${p.name}${sku ? ` · ${sku}` : ""}`,
              };
            }),
          );
        } catch {
          setProductOptions([]);
        }
      });
    }, 300);
    return () => clearTimeout(t);
  }, [productQuery, kinds]);

  const selectedProduct =
    value.productId && value.productLabel
      ? { id: value.productId, label: value.productLabel }
      : null;

  const activeUnits = useMemo(() => units.filter((u) => u.active), [units]);

  const compareOptions =
    entry.id === "inventory-period-compare"
      ? COMPARE_OPTIONS.filter((o) => o.id !== "none")
      : COMPARE_OPTIONS;

  return (
    <div className="space-y-3" data-test-id="inventory-report-params-form">
      {kinds.has("dateRange") ? (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-xs font-medium text-foreground">Período</p>
          <Select
            label="Período rápido"
            alwaysShowLabel
            options={DATE_PRESET_OPTIONS}
            value={value.datePreset}
            onChange={(id) => {
              const preset = String(id ?? "custom") as DatePreset;
              if (preset === "custom") {
                patch({ datePreset: "custom" });
                return;
              }
              const range = dateRangeForPreset(preset);
              patch({ datePreset: preset, ...range });
            }}
          />
          <div className="flex flex-col gap-2">
            <TextField
              label="Desde"
              type="date"
              alwaysShowLabel
              value={value.dateFrom}
              onChange={(e) =>
                patch({
                  datePreset: "custom",
                  dateFrom: e.target.value || toIsoDate(new Date()),
                })
              }
            />
            <TextField
              label="Hasta"
              type="date"
              alwaysShowLabel
              value={value.dateTo}
              onChange={(e) =>
                patch({
                  datePreset: "custom",
                  dateTo: e.target.value || toIsoDate(new Date()),
                })
              }
            />
          </div>
        </div>
      ) : null}

      {kinds.has("granularity") || kinds.has("compareWith") ? (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-xs font-medium text-foreground">Análisis</p>
          {kinds.has("granularity") ? (
            <Select
              label="Granularidad"
              alwaysShowLabel
              options={GRANULARITY_OPTIONS}
              value={value.granularity}
              onChange={(id) =>
                patch({ granularity: String(id ?? "auto") as ReportGranularity })
              }
            />
          ) : null}
          {kinds.has("compareWith") ? (
            <Select
              label="Comparar con"
              alwaysShowLabel
              options={compareOptions}
              value={
                entry.id === "inventory-period-compare" && value.compareWith === "none"
                  ? "previousPeriod"
                  : value.compareWith
              }
              onChange={(id) => patch({ compareWith: String(id ?? "none") as CompareWith })}
            />
          ) : null}
        </div>
      ) : null}

      {kinds.has("stockUnitMulti") ? (
        <fieldset
          className="space-y-1.5"
          data-test-id="inventory-report-stock-units"
        >
          <legend className="text-xs font-medium text-foreground">
            Unidad de stock
            {stockUnitRequired ? " *" : " (opcional)"}
          </legend>
          <p className="text-[11px] text-muted-foreground">
            Las cantidades no se mezclan entre unidades (p. ej. Un vs Kg).
          </p>
          <div className="flex max-h-36 flex-col gap-1 overflow-y-auto rounded border border-border p-2">
            {activeUnits.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                No hay unidades activas.
              </span>
            ) : (
              activeUnits.map((u) => {
                const checked = value.stockUnitIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        patch({ stockUnitIds: toggleId(value.stockUnitIds, u.id) })
                      }
                      data-test-id={`inventory-report-stock-unit-${u.id}`}
                    />
                    <span>
                      {u.symbol}
                      {u.name && u.name !== u.symbol ? ` · ${u.name}` : ""}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </fieldset>
      ) : null}

      {kinds.has("categoryMulti") ? (
        <fieldset
          className="space-y-1.5"
          data-test-id="inventory-report-categories"
        >
          <legend className="text-xs font-medium text-foreground">
            Categoría (opcional)
          </legend>
          <div className="flex max-h-36 flex-col gap-1 overflow-y-auto rounded border border-border p-2">
            {categories.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                No hay categorías.
              </span>
            ) : (
              categories.map((c) => {
                const checked = value.categoryIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        patch({
                          categoryIds: toggleId(value.categoryIds, c.id),
                        })
                      }
                      data-test-id={`inventory-report-category-${c.id}`}
                    />
                    <span>{c.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </fieldset>
      ) : null}

      {kinds.has("product") ? (
        <AutoComplete<ProductOpt>
          label="Producto (SKU / nombre)"
          alwaysShowLabel
          options={productOptions}
          value={selectedProduct}
          onChange={(opt) =>
            patch({
              productId: opt?.id ?? null,
              productLabel: opt?.label ?? null,
            })
          }
          onInputChange={setProductQuery}
          getOptionLabel={(o) => o.label}
          getOptionValue={(o) => o.id}
          placeholder="Buscar producto…"
        />
      ) : null}

      {kinds.has("storageMulti") ? (
        <Select
          label="Bodega"
          alwaysShowLabel
          options={[
            { id: "", label: "Todas" },
            ...storages.map((s) => ({ id: s.id, label: s.name })),
          ]}
          value={value.storageIds[0] ?? ""}
          onChange={(id) => patch({ storageIds: id ? [String(id)] : [] })}
        />
      ) : null}
    </div>
  );
}
