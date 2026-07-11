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
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import { fetchVariantPurchaseInsights } from "@/features/purchasing-document/infrastructure/purchasing-variant-insights.client";
import type { VariantPurchaseInsights } from "@/features/purchasing-document/types/purchasing-document.types";
import { formatMoney } from "@/shared/components/PurchaseDocumentBuilder/PurchaseDocumentProductPreview";
import {
  rechartsChartCursor,
  rechartsTooltipContentStyle,
  rechartsTooltipWrapperStyle,
} from "@/shared/charts/recharts-tooltip";

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
  if (!iso) {
    return "—";
  }
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
const qtyBar = "#0d9488";
const muted = "var(--color-muted-foreground, #7a8280)";
const border = "var(--color-border, #a5c2c2)";

function formatQtyAxis(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "0";
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function quantityInStockBase(
  row: { quantity: number; quantityInStockBase?: number },
  variant: ProductVariantGridRow,
): number {
  if (row.quantityInStockBase != null && Number.isFinite(row.quantityInStockBase)) {
    return row.quantityInStockBase;
  }
  const factor = variant.stockBaseQtyPerCountPurchaseUnit;
  if (factor != null && Number.isFinite(factor) && factor > 0) {
    return row.quantity * factor;
  }
  return row.quantity;
}

type VariantDetailPurchasesSectionProps = {
  variant: ProductVariantGridRow;
};

export function VariantDetailPurchasesSection({ variant }: VariantDetailPurchasesSectionProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<VariantPurchaseInsights | null>(null);

  const load = useCallback(async () => {
    const id = variant.id?.trim();
    if (!id) {
      setInsights(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVariantPurchaseInsights({
        variantId: id,
        accessToken: session?.user?.accessToken as string | undefined,
        activeCompanyId: (session?.user as { activeCompanyId?: string } | undefined)?.activeCompanyId,
        limit: 50,
      });
      setInsights(data);
    } catch (e) {
      setInsights(null);
      setError(e instanceof Error ? e.message : "No se pudo cargar compras");
    } finally {
      setLoading(false);
    }
  }, [variant.id, session?.user]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    const series = insights?.pmpSeries ?? [];
    return series.map((p) => ({
      at: p.at,
      label: formatShortDate(p.at),
      pmp: p.pmp,
    }));
  }, [insights?.pmpSeries]);

  const purchaseQtyChartData = useMemo(() => {
    const rows = insights?.recentPurchases ?? [];
    return [...rows]
      .filter((r) => r.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
      .map((r, idx) => ({
        key: `${r.transactionId ?? "tx"}-${idx}`,
        at: r.date!,
        label: formatShortDate(r.date!),
        qty: quantityInStockBase(r, variant),
        documentNumber: r.documentNumber,
      }));
  }, [insights?.recentPurchases, variant]);

  const stockUnit = insights?.variant.stockBaseUnitLabel ?? null;
  const currentPmp =
    insights?.variant.pmp != null && Number.isFinite(insights.variant.pmp)
      ? insights.variant.pmp
      : variant.pmp != null && Number.isFinite(Number(variant.pmp))
        ? Number(variant.pmp)
        : null;

  return (
    <div className="space-y-4" data-test-id="pv-section-compras">
      {loading ? (
        <LoadingState className="flex items-center justify-center py-4" label="Cargando compras" data-test-id="pv-compras-loading" />
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert" data-test-id="pv-compras-error">
          {error}
        </p>
      ) : null}

      {!loading && !error && insights ? (
        <>
          <section
            className="overflow-visible rounded-lg border border-border bg-background p-4"
            data-test-id="pv-compras-pmp-chart"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Evolución del PMP
            </p>
            {currentPmp != null ? (
              <p className="mt-1 text-sm text-foreground">
                PMP actual: <span className="font-semibold tabular-nums">{formatMoney(currentPmp)}</span>
                {stockUnit ? (
                  <span className="text-muted-foreground"> · por {stockUnit}</span>
                ) : null}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                {stockUnit ? `Precio medio ponderado por ${stockUnit}` : "Precio medio ponderado"}
              </p>
            )}
            {chartData.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Sin historial de PMP registrado.</p>
            ) : (
              <div
                className="fs-chart-surface mt-3 h-[min(240px,36vh)] w-full min-w-0 overflow-visible"
                onMouseDown={(e) => e.preventDefault()}
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="fillPmpVariantDetail" x1="0" y1="0" x2="0" y2="1">
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
                      cursor={rechartsChartCursor}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={rechartsTooltipWrapperStyle}
                      contentStyle={rechartsTooltipContentStyle}
                      formatter={(value) => [
                        formatMoney(typeof value === "number" ? value : Number(value)),
                        "PMP",
                      ]}
                      labelFormatter={(label, payload) => {
                        const row = payload?.[0]?.payload as { at?: string; label?: string } | undefined;
                        if (row?.at) {
                          return formatDateTime(row.at);
                        }
                        return typeof label === "string" ? label : String(label ?? "");
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pmp"
                      stroke={primary}
                      strokeWidth={2}
                      fill="url(#fillPmpVariantDetail)"
                      dot={{ r: 3, fill: primary }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section
            className="overflow-visible rounded-lg border border-border bg-background p-4"
            data-test-id="pv-compras-qty-chart"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Unidades de stock por recepción de compra
            </p>
            {purchaseQtyChartData.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Sin compras para graficar.</p>
            ) : (
              <div
                className="fs-chart-surface mt-3 h-[min(240px,36vh)] w-full min-w-0 overflow-visible"
                onMouseDown={(e) => e.preventDefault()}
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                  <AreaChart data={purchaseQtyChartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="fillPurchaseQtyVariantDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={qtyBar} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={qtyBar} stopOpacity={0.02} />
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
                      tickFormatter={formatQtyAxis}
                      width={48}
                    />
                    <Tooltip
                      cursor={rechartsChartCursor}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={rechartsTooltipWrapperStyle}
                      contentStyle={rechartsTooltipContentStyle}
                      formatter={(value) => {
                        const n = typeof value === "number" ? value : Number(value);
                        const text = stockUnit
                          ? `${formatQtyAxis(n)} ${stockUnit}`
                          : formatQtyAxis(n);
                        return [text, "Unidades"];
                      }}
                      labelFormatter={(label, payload) => {
                        const row = payload?.[0]?.payload as
                          | { at?: string; documentNumber?: string | null; label?: string }
                          | undefined;
                        if (row?.at) {
                          const when = formatDateTime(row.at);
                          return row.documentNumber ? `${when} · ${row.documentNumber}` : when;
                        }
                        return typeof label === "string" ? label : String(label ?? "");
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="qty"
                      stroke={qtyBar}
                      strokeWidth={2}
                      fill="url(#fillPurchaseQtyVariantDetail)"
                      dot={{ r: 3, fill: qtyBar }}
                      activeDot={{ r: 5 }}
                      name="Unidades"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section
            className="rounded-lg border border-border bg-background p-4"
            data-test-id="pv-compras-history"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Historial de compras
            </p>
            {insights.recentPurchases.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Sin compras registradas para esta variante.
              </p>
            ) : (
              <div className="mt-3 max-h-80 overflow-auto rounded-md border border-border">
                <table className="w-full min-w-[36rem] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-background text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="whitespace-nowrap px-3 py-2">Fecha</th>
                      <th className="whitespace-nowrap px-3 py-2">Cantidad</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right">Costo unit.</th>
                      <th className="whitespace-nowrap px-3 py-2">Proveedor</th>
                      <th className="whitespace-nowrap px-3 py-2">Destino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.recentPurchases.map((row, idx) => (
                      <tr
                        key={`${row.transactionId ?? "tx"}-${idx}`}
                        className="border-b border-border last:border-b-0 odd:bg-background even:bg-muted/15"
                        data-test-id={`pv-compras-row-${idx}`}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {formatDateTime(row.date)}
                          {row.documentNumber ? (
                            <span className="mt-0.5 block font-mono text-[10px]">{row.documentNumber}</span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-foreground">
                          {formatQuantity(quantityInStockBase(row, variant), stockUnit)}
                          {row.unitLabel && row.unitLabel !== stockUnit ? (
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">
                              Doc.: {formatQuantity(row.quantity, row.unitLabel)}
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">
                          {row.unitCost != null && Number.isFinite(row.unitCost)
                            ? formatMoney(row.unitCost)
                            : "—"}
                        </td>
                        <td className="max-w-[10rem] truncate px-3 py-2" title={row.supplierName ?? undefined}>
                          {row.supplierName ?? "—"}
                        </td>
                        <td className="max-w-[10rem] truncate px-3 py-2" title={row.destinationName ?? undefined}>
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
  );
}
