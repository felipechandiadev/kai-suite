"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AutoComplete, SelectDefault as Select, TextField } from "@kai/ui";
import type { ReportRegistryEntry } from "@/features/purchasing-reports/types/purchasing-report.types";
import {
  DATE_PRESET_OPTIONS,
  dateRangeForPreset,
  toIsoDate,
  type CompareWith,
  type DatePreset,
  type ReportGranularity,
} from "@/features/purchasing-reports/lib/report-dates";
import type { ReportFormState } from "@/features/purchasing-reports/lib/report-form";
import { searchProductsForPromotionAction } from "@/features/promotions/actions/search-products-for-promotion.action";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";

type ProductOpt = { id: string; label: string };
type SupplierOpt = { id: string; label: string };

const PAYMENT_OPTIONS = [
  { id: "", label: "Todos" },
  { id: "CASH", label: "Efectivo" },
  { id: "CREDIT_CARD", label: "Tarjeta crédito" },
  { id: "DEBIT_CARD", label: "Tarjeta débito" },
  { id: "TRANSFER", label: "Transferencia" },
  { id: "CHECK", label: "Cheque" },
  { id: "CREDIT", label: "Crédito" },
  { id: "INTERNAL_CREDIT", label: "Crédito interno" },
];

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
  suppliers: SupplierOpt[];
  storages: StorageListItem[];
  branches?: Array<{ id: string; label: string }>;
};

export function ReportParamsForm({
  entry,
  value,
  onChange,
  suppliers,
  storages,
  branches = [],
}: Props) {
  const kinds = useMemo(() => new Set(entry.params.map((p) => p.kind)), [entry]);
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOpt[]>([]);
  const [supplierQuery, setSupplierQuery] = useState("");
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

  const supplierOptions = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) return suppliers.slice(0, 40);
    return suppliers
      .filter((s) => s.label.toLowerCase().includes(q))
      .slice(0, 40);
  }, [suppliers, supplierQuery]);

  const selectedProduct =
    value.productId && value.productLabel
      ? { id: value.productId, label: value.productLabel }
      : null;
  const selectedSupplier =
    value.supplierId && value.supplierLabel
      ? { id: value.supplierId, label: value.supplierLabel }
      : null;

  const compareOptions =
    entry.id === "purchases-period-compare"
      ? COMPARE_OPTIONS.filter((o) => o.id !== "none")
      : COMPARE_OPTIONS;

  return (
    <div className="space-y-3" data-test-id="purchasing-report-params-form">
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

      {kinds.has("branch") || kinds.has("granularity") || kinds.has("compareWith") ? (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-xs font-medium text-foreground">Alcance y análisis</p>
          {kinds.has("branch") ? (
            <Select
              label="Sucursal"
              alwaysShowLabel
              options={[{ id: "", label: "Todas" }, ...branches]}
              value={value.branchId}
              onChange={(id) => patch({ branchId: String(id ?? "") })}
            />
          ) : null}
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
                entry.id === "purchases-period-compare" && value.compareWith === "none"
                  ? "previousPeriod"
                  : value.compareWith
              }
              onChange={(id) =>
                patch({ compareWith: String(id ?? "none") as CompareWith })
              }
            />
          ) : null}
        </div>
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

      {kinds.has("supplier") ? (
        <AutoComplete<SupplierOpt>
          label="Proveedor"
          alwaysShowLabel
          options={supplierOptions}
          value={selectedSupplier}
          onChange={(opt) =>
            patch({
              supplierId: opt?.id ?? null,
              supplierLabel: opt?.label ?? null,
            })
          }
          onInputChange={setSupplierQuery}
          getOptionLabel={(o) => o.label}
          getOptionValue={(o) => o.id}
          placeholder="Buscar proveedor…"
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

      {kinds.has("paymentMethod") ? (
        <Select
          label="Medio de pago"
          alwaysShowLabel
          options={PAYMENT_OPTIONS}
          value={value.paymentMethod}
          onChange={(id) => patch({ paymentMethod: String(id ?? "") })}
        />
      ) : null}
    </div>
  );
}
