"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dialog } from "@kai/ui";
import type { PurchasingVariantSearchItem } from "@/features/purchasing-document/types/purchasing-document.types";
import { fetchVariantPurchaseInsights } from "@/features/purchasing-document/infrastructure/purchasing-variant-insights.client";
import type { VariantPurchaseInsights } from "@/features/purchasing-document/types/purchasing-document.types";
import { formatMoney, ProductNameWithAttributes } from "./PurchaseDocumentProductPreview";

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatQuantity(qty: number, unitLabel: string | null): string {
  const n = Number(qty);
  const base = Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(2)) : "0";
  return unitLabel ? `${base} ${unitLabel}` : base;
}

const primary = "var(--color-primary, #1e73ae)";
const muted = "var(--color-muted-foreground, #7a8280)";
const border = "var(--color-border, #a5c2c2)";

type PurchaseVariantPurchaseInsightsDialogProps = {
  open: boolean;
  onClose: () => void;
  previewItem: PurchasingVariantSearchItem | null;
};

export function PurchaseVariantPurchaseInsightsDialog({
  open,
  onClose,
  previewItem,
}: PurchaseVariantPurchaseInsightsDialogProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<VariantPurchaseInsights | null>(null);

  const load = useCallback(async () => {
    if (!previewItem?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVariantPurchaseInsights({
        variantId: previewItem.id,
        accessToken: session?.user?.accessToken as string | undefined,
        activeCompanyId: (session?.user as { activeCompanyId?: string } | undefined)?.activeCompanyId,
        limit: 20,
      });
      setInsights(data);
    } catch (e) {
      setInsights(null);
      setError(e instanceof Error ? e.message : "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [previewItem?.id, session?.user]);

  useEffect(() => {
    if (!open || !previewItem?.id) {
      return;
    }
    void load();
  }, [open, previewItem?.id, load]);

  const chartData = useMemo(() => {
    const series = insights?.pmpSeries ?? [];
    return series.map((p) => ({
      at: p.at,
      label: formatShortDate(p.at),
      pmp: p.pmp,
    }));
  }, [insights?.pmpSeries]);

  const stockUnit =
    insights?.variant.stockBaseUnitLabel ?? previewItem?.stockBaseUnitLabel ?? null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Evolución PMP y compras"
      size="lg"
      data-test-id="purchase-variant-insights-dialog"
    >
      <div className="space-y-4">
        {previewItem ? (
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
            <ProductNameWithAttributes
              name={previewItem.productName}
              attributeValues={previewItem.attributeValues}
              className="text-sm font-medium text-foreground"
            />
            <p className="mt-1 font-mono text-xs text-muted-foreground">SKU {previewItem.sku}</p>
          </div>
        ) : null}

        {loading ? (
          <LoadingState className="flex items-center justify-center py-4" data-test-id="purchase-variant-insights-loading" />
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && insights ? (
          <>
            <section>
              <h3 className="text-sm font-semibold text-foreground">Evolución del PMP</h3>
              <p className="text-xs text-muted-foreground">
                {stockUnit ? `Por unidad base (${stockUnit})` : "Precio medio ponderado"}
              </p>
              {chartData.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Sin historial de PMP registrado.</p>
              ) : (
                <div className="mt-3 h-[min(280px,40vh)] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillPmpInsights" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={primary} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={border} strokeDasharray="4 8" vertical={false} opacity={0.65} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: muted, fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: border }}
                      />
                      <YAxis
                        tick={{ fill: muted, fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: border }}
                        tickFormatter={(v) => formatMoney(Number(v))}
                        width={72}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatMoney(value), "PMP"]}
                        labelFormatter={(_, payload) => {
                          const row = payload?.[0]?.payload as { at?: string } | undefined;
                          return row?.at ? formatDateTime(row.at) : "";
                        }}
                        contentStyle={{
                          borderRadius: 8,
                          border: `1px solid ${border}`,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pmp"
                        stroke={primary}
                        strokeWidth={2}
                        fill="url(#fillPmpInsights)"
                        dot={{ r: 3, fill: primary }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Últimas compras</h3>
              <p className="text-xs text-muted-foreground">Ingresos confirmados (documento PURCHASE)</p>
              {insights.recentPurchases.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Sin compras registradas para esta variante.</p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[32rem] text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Fecha</th>
                        <th className="px-2 py-2 font-medium">Cantidad</th>
                        <th className="px-2 py-2 font-medium">Proveedor</th>
                        <th className="px-2 py-2 font-medium">Destino</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.recentPurchases.map((row, idx) => (
                        <tr
                          key={`${row.transactionId ?? "tx"}-${idx}`}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="whitespace-nowrap px-2 py-2 tabular-nums text-foreground">
                            {formatDateTime(row.date)}
                            {row.documentNumber ? (
                              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                                {row.documentNumber}
                              </span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                            {formatQuantity(row.quantity, row.unitLabel)}
                          </td>
                          <td className="max-w-[10rem] truncate px-2 py-2" title={row.supplierName ?? undefined}>
                            {row.supplierName ?? "—"}
                          </td>
                          <td className="max-w-[10rem] truncate px-2 py-2" title={row.destinationName ?? undefined}>
                            {row.destinationName ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
