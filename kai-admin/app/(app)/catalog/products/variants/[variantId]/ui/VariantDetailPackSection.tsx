"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton, NumberStepper } from "@kai/ui";
import {
  getPackCompositionAction,
  getPackPmpSummaryAction,
  searchPackComponentsAction,
  upsertPackCompositionAction,
} from "@/features/packs/actions/pack.action";
import type { PackLineDto } from "@/features/packs/infrastructure/pack.request";

type VariantDetailPackSectionProps = {
  outputVariantId: string;
  refreshKey?: number;
};

const QTY_MIN = 0.001;
const QTY_PERSIST_DEBOUNCE_MS = 400;

function normalizeQty(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return QTY_MIN;
  return Math.max(QTY_MIN, Math.round(n * 1000) / 1000);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function toPersistLines(nextLines: PackLineDto[]) {
  return nextLines.map((l, idx) => ({
    inputVariantId: l.inputVariantId,
    qtyPerOutputUnit: normalizeQty(Number(l.qtyPerOutputUnit)),
    sortOrder: idx + 1,
  }));
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
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLinesRef = useRef<PackLineDto[] | null>(null);

  const cancelPendingPersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    pendingLinesRef.current = null;
  }, []);

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
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    void searchPackComponentsAction(q, 1, outputVariantId).then((res) => {
      if (cancelled) return;
      setSearchResults(
        (res.items ?? []).map((item) => ({
          variantId: item.variantId,
          productName: item.productName?.trim() || item.sku || item.variantId,
          sku: item.sku?.trim() || "",
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [searchQ, outputVariantId]);

  const saveLines = async (nextLines: PackLineDto[], mode: "reload" | "pmp") => {
    setLoadError(null);
    if (mode === "reload") {
      setSaving(true);
    }
    try {
      await upsertPackCompositionAction({
        variantId: outputVariantId,
        lines: toPersistLines(nextLines),
      });
      if (mode === "reload") {
        await reload();
      } else {
        const pmp = await getPackPmpSummaryAction(outputVariantId);
        setPackPmp(Number(pmp.packPmp) || 0);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      if (mode === "reload") {
        setSaving(false);
      }
    }
  };

  const addComponent = (variantId: string, productName: string, sku: string) => {
    if (variantId === outputVariantId) return;
    if (lines.some((l) => l.inputVariantId === variantId)) return;
    cancelPendingPersist();
    void saveLines(
      [
        ...lines,
        {
          inputVariantId: variantId,
          qtyPerOutputUnit: 1,
          inputProductName: productName,
          inputSku: sku || null,
        },
      ],
      "reload",
    );
    setSearchQ("");
    setSearchResults([]);
  };

  const removeLine = (inputVariantId: string) => {
    cancelPendingPersist();
    void saveLines(
      lines.filter((l) => l.inputVariantId !== inputVariantId),
      "reload",
    );
  };

  const updateQty = (inputVariantId: string, qty: number) => {
    const nextQty = normalizeQty(qty);
    const nextLines = lines.map((l) =>
      l.inputVariantId === inputVariantId ? { ...l, qtyPerOutputUnit: nextQty } : l,
    );
    setLines(nextLines);
    pendingLinesRef.current = nextLines;
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      const toSave = pendingLinesRef.current;
      pendingLinesRef.current = null;
      if (toSave) {
        void saveLines(toSave, "pmp");
      }
    }, QTY_PERSIST_DEBOUNCE_MS);
  };

  const visibleSearchResults = searchResults.filter(
    (r) =>
      r.variantId !== outputVariantId &&
      !lines.some((l) => l.inputVariantId === r.variantId),
  );

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
                <th className="w-36 px-3 py-2">Cant.</th>
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
                    <td className="px-3 py-2">
                      <NumberStepper
                        value={normalizeQty(Number(line.qtyPerOutputUnit))}
                        onChange={(v) => updateQty(line.inputVariantId, v)}
                        min={QTY_MIN}
                        step={0.01}
                        allowFloat
                        allowNegative={false}
                        data-test-id={`pack-qty-${line.inputVariantId}`}
                      />
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
        <label className="text-xs font-medium text-muted-foreground">
          Agregar componente (físico, elaborado o manufacturado)
        </label>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Buscar variante…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          disabled={saving}
        />
        {visibleSearchResults.length > 0 ? (
          <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
            {visibleSearchResults.map((r) => (
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
