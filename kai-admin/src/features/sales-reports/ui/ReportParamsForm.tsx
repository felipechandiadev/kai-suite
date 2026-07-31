"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AutoComplete, SelectDefault as Select, TextField } from "@kai/ui";
import type { ReportRegistryEntry } from "@/features/sales-reports/types/sales-report.types";
import {
  DATE_PRESET_OPTIONS,
  dateRangeForPreset,
  type CompareWith,
  type DatePreset,
  type ReportGranularity,
  toIsoDate,
} from "@/features/sales-reports/lib/report-dates";
import { type ReportFormState } from "@/features/sales-reports/lib/report-form";
import { searchProductsForPromotionAction } from "@/features/promotions/actions/search-products-for-promotion.action";
import { listCustomersForPage } from "@/features/sales-customers/actions/customer.action";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";

export type { ReportFormState } from "@/features/sales-reports/lib/report-form";
export {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
} from "@/features/sales-reports/lib/report-form";

type ProductOpt = { id: string; label: string };
type CustomerOpt = { id: string; label: string };

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
  pointsOfSale: PointOfSaleListItem[];
  cashSessions: Array<{ id: string; label: string }>;
  branches: Array<{ id: string; label: string }>;
};

export function ReportParamsForm({
  entry,
  value,
  onChange,
  pointsOfSale,
  cashSessions,
  branches,
}: Props) {
  const kinds = useMemo(() => new Set(entry.params.map((p) => p.kind)), [entry]);
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOpt[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerOpt[]>([]);
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

  useEffect(() => {
    if (!kinds.has("customer")) return;
    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerOptions([]);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await listCustomersForPage({ query: q, page: 1, pageSize: 20 });
          setCustomerOptions(
            (res.customers ?? []).map((c) => ({
              id: c.id,
              label: `${c.displayName}${c.documentNumber ? ` · ${c.documentNumber}` : ""}`,
            })),
          );
        } catch {
          setCustomerOptions([]);
        }
      });
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery, kinds]);

  const selectedProduct =
    value.productId && value.productLabel
      ? { id: value.productId, label: value.productLabel }
      : null;
  const selectedCustomer =
    value.customerId && value.customerLabel
      ? { id: value.customerId, label: value.customerLabel }
      : null;

  const posOptions = useMemo(
    () => [
      { id: "", label: "Todos" },
      ...pointsOfSale.map((p) => ({ id: p.id, label: p.name })),
    ],
    [pointsOfSale],
  );

  const compareOptions =
    entry.id === "sales-period-compare"
      ? COMPARE_OPTIONS.filter((o) => o.id !== "none")
      : COMPARE_OPTIONS;

  return (
    <div className="space-y-3" data-test-id="sales-report-params-form">
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

      {(kinds.has("branch") ||
        kinds.has("posMulti") ||
        kinds.has("posPair") ||
        kinds.has("granularity") ||
        kinds.has("compareWith")) && (
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
          {kinds.has("posMulti") ? (
            <Select
              label="Punto de venta"
              alwaysShowLabel
              options={posOptions}
              value={value.pointOfSaleIds[0] ?? ""}
              onChange={(id) => patch({ pointOfSaleIds: id ? [String(id)] : [] })}
            />
          ) : null}
          {kinds.has("posPair") ? (
            <>
              <Select
                label="POS A"
                alwaysShowLabel
                options={[{ id: "", label: "Seleccionar…" }, ...pointsOfSale.map((p) => ({ id: p.id, label: p.name }))]}
                value={value.posAId}
                onChange={(id) => patch({ posAId: String(id ?? "") })}
              />
              <Select
                label="POS B"
                alwaysShowLabel
                options={[{ id: "", label: "Seleccionar…" }, ...pointsOfSale.map((p) => ({ id: p.id, label: p.name }))]}
                value={value.posBId}
                onChange={(id) => patch({ posBId: String(id ?? "") })}
              />
            </>
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
                entry.id === "sales-period-compare" && value.compareWith === "none"
                  ? "previousPeriod"
                  : value.compareWith
              }
              onChange={(id) =>
                patch({ compareWith: String(id ?? "none") as CompareWith })
              }
            />
          ) : null}
        </div>
      )}

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

      {kinds.has("customer") ? (
        <AutoComplete<CustomerOpt>
          label="Cliente"
          alwaysShowLabel
          options={customerOptions}
          value={selectedCustomer}
          onChange={(opt) =>
            patch({
              customerId: opt?.id ?? null,
              customerLabel: opt?.label ?? null,
            })
          }
          onInputChange={setCustomerQuery}
          getOptionLabel={(o) => o.label}
          getOptionValue={(o) => o.id}
          placeholder="Buscar cliente…"
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

      {kinds.has("cashSession") ? (
        <Select
          label="Sesión de caja"
          alwaysShowLabel
          options={[{ id: "", label: "Ninguna (usar fechas)" }, ...cashSessions]}
          value={value.cashSessionId}
          onChange={(id) => patch({ cashSessionId: String(id ?? "") })}
        />
      ) : null}

      {kinds.has("topN") ? (
        <TextField
          label="Top N"
          type="number"
          alwaysShowLabel
          value={value.topN}
          onChange={(e) => patch({ topN: e.target.value })}
        />
      ) : null}
    </div>
  );
}
