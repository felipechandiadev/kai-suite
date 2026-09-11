"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Badge, Button, SelectDefault as Select, TextField } from "@kai/ui";
import { calculatePricingAction } from "../actions/pricing.action";
import type { PricingCalculateLine, PricingCalculateResult } from "../types/pricing.types";
import { PRICING_ALERT_LABEL } from "../types/pricing.types";

type Option = { id: string; label: string };

type Props = {
  priceLists: Option[];
  branches: Option[];
  categories: Option[];
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatQty(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/** Margen de contribución sobre lista: (lista − piso) / lista */
function marginPct(listNet: number, floorNet: number): number | null {
  if (listNet <= 0) return null;
  return ((listNet - floorNet) / listNet) * 100;
}

/** Variación lista → sugerido: (sugerido − lista) / lista */
function deltaSuggestedPct(listNet: number, suggestedNet: number): number | null {
  if (listNet <= 0) return null;
  return ((suggestedNet - listNet) / listNet) * 100;
}

function alertBadgeVariant(alert: string): "error" | "warning" | "secondary" | "success" {
  if (alert === "BELOW_FLOOR") return "error";
  if (alert === "BELOW_PE") return "warning";
  if (alert === "INSUFFICIENT_DATA") return "secondary";
  return "success";
}

function deltaClass(pct: number | null): string {
  if (pct == null) return "text-muted-foreground";
  if (pct > 0.5) return "text-amber-700 dark:text-amber-400";
  if (pct < -0.5) return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}

function ContextStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PricingWorkspace({ priceLists, branches, categories }: Props) {
  const [priceListId, setPriceListId] = useState(priceLists[0]?.id ?? "");
  const [branchId, setBranchId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [weekIso, setWeekIso] = useState("");
  const [targetMarginPercent, setTargetMarginPercent] = useState("35");
  const [preview, setPreview] = useState<PricingCalculateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const input = useMemo(
    () => ({
      priceListId,
      branchId: branchId || undefined,
      categoryId: categoryId || undefined,
      weekIso: weekIso.trim() || undefined,
      targetMarginPercent: Number(targetMarginPercent) || 35,
    }),
    [priceListId, branchId, categoryId, weekIso, targetMarginPercent],
  );

  const runCalculate = useCallback(() => {
    if (!priceListId) {
      setError("Selecciona una lista de precios.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await calculatePricingAction(input);
      if (!res.success) {
        setError(res.error);
        setPreview(null);
        return;
      }
      setPreview(res.data);
    });
  }, [input, priceListId]);

  const lines = preview?.lines ?? [];

  const sharePct =
    preview && preview.companyNetSales > 0
      ? (preview.entityNetSales / preview.companyNetSales) * 100
      : null;

  const structureHint = useMemo(() => {
    if (!preview) return null;
    if (preview.gfPoolNet <= 0) {
      return "Pool GF en $0: el PE no suma estructura (revisá gastos fijos / nómina en la ventana).";
    }
    if (preview.unitQuota <= 0) {
      return "Cuota unitaria $0: sin unidades vendidas en la ventana para prorratear.";
    }
    return null;
  }, [preview]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-test-id="pricing-workspace">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TextField
          label="Semana ISO (opcional)"
          placeholder="2026-W35"
          value={weekIso}
          onChange={(e) => setWeekIso(e.target.value)}
        />
        <Select
          label="Lista destino"
          alwaysShowLabel
          value={priceListId}
          onChange={(id) => setPriceListId(String(id ?? ""))}
          options={priceLists.map((p) => ({ id: p.id, label: p.label }))}
        />
        <Select
          label="Sucursal"
          alwaysShowLabel
          value={branchId}
          onChange={(id) => setBranchId(String(id ?? ""))}
          options={[{ id: "", label: "Todas" }, ...branches.map((b) => ({ id: b.id, label: b.label }))]}
        />
        <Select
          label="Categoría"
          alwaysShowLabel
          value={categoryId}
          onChange={(id) => setCategoryId(String(id ?? ""))}
          options={[
            { id: "", label: "Todas" },
            ...categories.map((c) => ({ id: c.id, label: c.label })),
          ]}
        />
        <TextField
          label="Margen objetivo (%)"
          type="number"
          min={0}
          max={99}
          value={targetMarginPercent}
          onChange={(e) => setTargetMarginPercent(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={runCalculate} disabled={pending || !priceListId}>
          Calcular
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {preview ? (
        <div
          className="space-y-3 rounded-lg border border-border bg-muted/20 p-4"
          data-test-id="pricing-context-panel"
        >
          <p className="text-sm text-foreground">
            Cuota según ventas de{" "}
            <span className="font-medium">
              {preview.salesWindowFrom} → {preview.salesWindowTo}
            </span>
            {preview.weekIso ? (
              <span className="text-muted-foreground"> · análisis {preview.weekIso}</span>
            ) : null}
            <span className="text-muted-foreground">
              {" "}
              · margen objetivo {preview.targetMarginPercent}%
            </span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ContextStat
              label="Pool GF"
              value={formatMoney(preview.gfPoolNet)}
              hint="Gastos de estructura del periodo"
            />
            <ContextStat
              label="Ventas netas (empresa)"
              value={formatMoney(preview.companyNetSales)}
              hint={
                sharePct != null
                  ? `Entidad ${formatMoney(preview.entityNetSales)} · share ${sharePct.toFixed(1)}%`
                  : "Sin ventas en la ventana"
              }
            />
            <ContextStat
              label="Cuota GF entidad"
              value={formatMoney(preview.gfQuota)}
              hint="Pool × participación en ventas"
            />
            <ContextStat
              label="Cuota unitaria"
              value={formatMoney(preview.unitQuota)}
              hint="Se suma al piso para el PE"
            />
          </div>
          {structureHint ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">{structureHint}</p>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-280 text-sm">
          <thead className="sticky top-0 bg-card text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2 text-right" title="Costo directo (PMP)">
                Piso
              </th>
              <th className="px-3 py-2 text-right" title="Precio neto vigente en lista">
                Lista
              </th>
              <th
                className="px-3 py-2 text-right"
                title="Parte de estructura asignada por unidad"
              >
                Cuota
              </th>
              <th className="px-3 py-2 text-right" title="Piso + cuota unitaria">
                PE
              </th>
              <th className="px-3 py-2 text-right" title="Piso / (1 − margen objetivo)">
                Objetivo
              </th>
              <th className="px-3 py-2 text-right" title="max(objetivo, PE)">
                Sugerido
              </th>
              <th className="px-3 py-2 text-right" title="Sugerido con IVA de la lista">
                Góndola
              </th>
              <th className="px-3 py-2 text-right" title="(lista − piso) / lista">
                Margen
              </th>
              <th className="px-3 py-2 text-right" title="(sugerido − lista) / lista">
                Δ sug.
              </th>
              <th className="px-3 py-2 text-right" title="Unidades vendidas en la ventana">
                Ud.
              </th>
              <th className="px-3 py-2">Alerta</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                  Calcula para ver el grid de precios.
                </td>
              </tr>
            ) : (
              lines.map((line) => <PricingRow key={line.variantId} line={line} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PricingRow({ line }: { line: PricingCalculateLine }) {
  const margin = marginPct(line.listNet, line.floorNet);
  const delta = deltaSuggestedPct(line.listNet, line.suggestedNet);

  return (
    <tr className="border-t border-border/60">
      <td className="px-3 py-2">
        <div className="font-medium text-foreground">{line.productName}</div>
        {line.sku ? <div className="text-xs text-muted-foreground">{line.sku}</div> : null}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.floorNet)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.listNet)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
        {formatMoney(line.unitQuota)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.peNet)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.targetNet)}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium">
        {formatMoney(line.suggestedNet)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
        {formatMoney(line.suggestedGross)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatPct(margin)}</td>
      <td className={`px-3 py-2 text-right tabular-nums ${deltaClass(delta)}`}>
        {formatPct(delta)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
        {formatQty(line.unitsInWindow)}
      </td>
      <td className="px-3 py-2">
        <Badge variant={alertBadgeVariant(line.alert)}>{PRICING_ALERT_LABEL[line.alert]}</Badge>
      </td>
    </tr>
  );
}
