"use client";

import { useCallback, useEffect, useState } from "react";
import { IconButton } from "@kai/ui";
import {
  getPackCompositionAction,
  getPackPmpSummaryAction,
  upsertPackCompositionAction,
} from "@/features/packs/actions/pack.action";
import { searchRecipeVariantCatalogAction } from "@/features/recipes/actions/recipe.action";
import type { PackLineDto } from "@/features/packs/infrastructure/pack.request";

type VariantDetailPackSectionProps = {
  outputVariantId: string;
  refreshKey?: number;
};

function formatQty(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "");
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function VariantDetailPackSection({
  outputVariantId,
  refreshKey = 0,
}: VariantDetailPackSectionProps) {
  const [lines, setLines] = useState<PackLineDto[]>([]);
  const [packPmp, setPackPmp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ variantId: string; productName: string; sku: string }>
  >([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [composition, pmp] = await Promise.all([
        getPackCompositionAction(outputVariantId),
        getPackPmpSummaryAction(outputVariantId),
      ]);
      setLines(composition.lines ?? []);
      setPackPmp(Number(pmp.packPmp) || 0);
      if (composition.error) {
        setLoadError(composition.error);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Error al cargar pack");
      setLines([]);
      setPackPmp(0);
    } finally {
      setLoading(false);
    }
  }, [outputVariantId]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    void searchRecipeVariantCatalogAction(q, 1).then((res) => {
      if (cancelled) return;
      setSearchResults(
        (res.items ?? []).map((item) => ({
          variantId: item.id,
          productName: item.productName?.trim() || item.sku || item.id,
          sku: item.sku?.trim() || "",
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [searchQ]);

  const saveLines = async (nextLines: PackLineDto[]) => {
    setSaving(true);
    setLoadError(null);
    try {
      await upsertPackCompositionAction({
        variantId: outputVariantId,
        lines: nextLines.map((l, idx) => ({
          inputVariantId: l.inputVariantId,
          qtyPerOutputUnit: Number(l.qtyPerOutputUnit) || 1,
          sortOrder: idx + 1,
        })),
      });
      await reload();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const addComponent = (variantId: string, productName: string, sku: string) => {
    if (lines.some((l) => l.inputVariantId === variantId)) return;
    void saveLines([
      ...lines,
      {
        inputVariantId: variantId,
        qtyPerOutputUnit: 1,
        inputProductName: productName,
        inputSku: sku || null,
      },
    ]);
    setSearchQ("");
    setSearchResults([]);
  };

  const removeLine = (inputVariantId: string) => {
    void saveLines(lines.filter((l) => l.inputVariantId !== inputVariantId));
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-background p-4" data-test-id="pv-section-pack">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Composición del pack</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kit fantasma: al vender se descuenta stock de cada componente en la bodega del POS.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          PMP del grupo (informativo): <span className="font-medium text-foreground">{formatMoney(packPmp)}</span>
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
      {loadError ? <p className="text-sm text-error">{loadError}</p> : null}

      {!loading && lines.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Producto</th>
                <th className="w-40 px-3 py-2">SKU</th>
                <th className="w-24 px-3 py-2">Cant.</th>
                <th className="w-12 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const name =
                  line.inputProductName?.trim() || line.inputSku?.trim() || line.inputVariantId;
                const sku = line.inputSku?.trim() || "—";
                return (
                  <tr key={line.inputVariantId} className="border-b border-border/70">
                    <td className="px-3 py-2 font-medium text-foreground">{name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{sku}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatQty(Number(line.qtyPerOutputUnit) || 0)}
                    </td>
                    <td className="px-3 py-2">
                      <IconButton
                        icon="Trash2"
                        variant="ghost"
                        size="sm"
                        ariaLabel="Quitar componente"
                        disabled={saving}
                        onClick={() => removeLine(line.inputVariantId)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Agregar componente vendible</label>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Buscar variante…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          disabled={saving}
        />
        {searchResults.length > 0 ? (
          <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
            {searchResults.map((r) => (
              <li key={r.variantId}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => addComponent(r.variantId, r.productName, r.sku)}
                  disabled={saving}
                >
                  <span className="font-medium">{r.productName}</span>
                  {r.sku ? (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{r.sku}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
