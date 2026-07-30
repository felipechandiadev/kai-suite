"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AutoComplete, Button, SelectDefault as Select, TextField } from "@kai/ui";
import type { ReportRegistryEntry } from "@/features/sales-reports/types/sales-report.types";
import {
  dateRangeForPreset,
  type DatePreset,
  toIsoDate,
} from "@/features/sales-reports/lib/report-dates";
import {
  type ReportFormState,
} from "@/features/sales-reports/lib/report-form";
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

const PRESET_OPTIONS: Array<{ id: DatePreset; label: string }> = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Últimos 7 días" },
  { id: "month", label: "Mes actual" },
  { id: "prev-month", label: "Mes anterior" },
];

type Props = {
  entry: ReportRegistryEntry;
  value: ReportFormState;
  onChange: (next: ReportFormState) => void;
  pointsOfSale: PointOfSaleListItem[];
  cashSessions: Array<{ id: string; label: string }>;
};

export function ReportParamsForm({
  entry,
  value,
  onChange,
  pointsOfSale,
  cashSessions,
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

  return (
    <div className="space-y-3" data-test-id="sales-report-params-form">
      {kinds.has("dateRange") ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {PRESET_OPTIONS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant="outlined"
                className="px-2! py-0.5! text-[11px]"
                onClick={() => {
                  const range = dateRangeForPreset(p.id);
                  patch(range);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <TextField
              label="Desde"
              type="date"
              alwaysShowLabel
              value={value.dateFrom}
              onChange={(e) => patch({ dateFrom: e.target.value || toIsoDate(new Date()) })}
            />
            <TextField
              label="Hasta"
              type="date"
              alwaysShowLabel
              value={value.dateTo}
              onChange={(e) => patch({ dateTo: e.target.value || toIsoDate(new Date()) })}
            />
          </div>
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

      {kinds.has("posMulti") ? (
        <Select
          label="Punto de venta"
          alwaysShowLabel
          options={[
            { id: "", label: "Todos" },
            ...pointsOfSale.map((p) => ({ id: p.id, label: p.name })),
          ]}
          value={value.pointOfSaleIds[0] ?? ""}
          onChange={(id) => patch({ pointOfSaleIds: id ? [String(id)] : [] })}
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
