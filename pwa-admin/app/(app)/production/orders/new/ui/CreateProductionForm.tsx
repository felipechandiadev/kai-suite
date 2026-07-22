"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, TextField } from "@kai/ui";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type {
  ProductionUnitListItem,
  VariantProductionCostPreview,
} from "@/features/inventory-production-units/types/production-unit.types";
import { previewProductionUnitVariantCostAction } from "@/features/inventory-production-units/actions/production-unit.action";
import type { ProductionAttribute } from "@/features/inventory-products/types/production-attributes.types";
import type { ManufactureVariantSearchItem } from "@/features/inventory-production/types/production-batch.types";
import {
  createProductionBatchAction,
  listVariantProductionAttributesAction,
} from "@/features/inventory-production/actions/production-batch.action";
import { ManufactureVariantSearchPanel } from "./ManufactureVariantSearchPanel";

type Props = {
  storages: StorageListItem[];
  productionUnits: ProductionUnitListItem[];
  /** Fallback si la unidad/almacén no traen branch. */
  fallbackBranchId?: string | null;
};

type LotLine = {
  lineKey: string;
  variantId: string;
  sku: string;
  productName: string;
  quantity: string;
  notes: string;
  attributeSelections: Record<string, string>;
  attributes: ProductionAttribute[];
  attrsLoading: boolean;
};

function newLineKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export function CreateProductionForm({
  storages,
  productionUnits,
  fallbackBranchId = null,
}: Props) {
  const router = useRouter();
  const batchUnits = useMemo(
    () =>
      productionUnits.filter((u) => u.isActive && u.purpose === "BATCH"),
    [productionUnits],
  );

  const [productionUnitId, setProductionUnitId] = useState(
    () => batchUnits[0]?.id ?? "",
  );
  const [outputStorageId, setOutputStorageId] = useState("");
  const [capacity, setCapacity] = useState("");
  const [plannedStartAt, setPlannedStartAt] = useState("");
  const [plannedDeliveryAt, setPlannedDeliveryAt] = useState("");
  const [headerNotes, setHeaderNotes] = useState("");
  const [lots, setLots] = useState<LotLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costByVariant, setCostByVariant] = useState<
    Record<string, VariantProductionCostPreview | null>
  >({});

  const selectedUnit = batchUnits.find((u) => u.id === productionUnitId);

  const outputStorageOptions = useMemo(
    () =>
      storages
        .filter((s) => s.isActive && s.category !== "PRODUCTION_INPUT")
        .map((s) => ({
          id: s.id,
          label: s.branch?.name ? `${s.name} · ${s.branch.name}` : s.name,
        })),
    [storages],
  );

  const storageLabel = (id: string | null | undefined) => {
    if (!id) return "—";
    const s = storages.find((x) => x.id === id);
    return s?.name ?? id;
  };

  const resolveBranchId = (): string | null => {
    if (selectedUnit?.branchId) return selectedUnit.branchId;
    const fromOut = outputStorageId
      ? storages.find((s) => s.id === outputStorageId)?.branchId
      : null;
    if (fromOut) return fromOut;
    const inId = selectedUnit?.defaultInputStorageId;
    const fromIn = inId
      ? storages.find((s) => s.id === inId)?.branchId
      : null;
    if (fromIn) return fromIn;
    return fallbackBranchId;
  };

  const lotVariantKey = lots.map((l) => l.variantId).join("|");

  useEffect(() => {
    if (!batchUnits.some((u) => u.id === productionUnitId)) {
      setProductionUnitId(batchUnits[0]?.id ?? "");
    }
  }, [batchUnits, productionUnitId]);

  useEffect(() => {
    setLots([]);
    setCostByVariant({});
    setOutputStorageId(outputStorageOptions[0]?.id ?? "");
  }, [productionUnitId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!productionUnitId || lots.length === 0) return;
    const variantIds = [...new Set(lots.map((l) => l.variantId))];
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        variantIds.map(async (variantId) => {
          const preview = await previewProductionUnitVariantCostAction(
            productionUnitId,
            variantId,
          );
          return [variantId, preview] as const;
        }),
      );
      if (cancelled) return;
      setCostByVariant((prev) => {
        const next = { ...prev };
        for (const [variantId, preview] of entries) {
          next[variantId] = preview;
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [productionUnitId, lotVariantKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const addLotFromVariant = async (item: ManufactureVariantSearchItem) => {
    const lineKey = newLineKey();
    const draft: LotLine = {
      lineKey,
      variantId: item.variantId,
      sku: item.sku,
      productName: item.productName,
      quantity: "1",
      notes: "",
      attributeSelections: {},
      attributes: [],
      attrsLoading: true,
    };
    setLots((prev) => [...prev, draft]);
    setError(null);

    const attrs = await listVariantProductionAttributesAction(item.variantId);
    setLots((prev) =>
      prev.map((l) =>
        l.lineKey === lineKey
          ? {
              ...l,
              attributes: attrs,
              attrsLoading: false,
              attributeSelections: Object.fromEntries(
                attrs.map((a) => [a.id, a.options[0]?.id ?? ""]),
              ),
            }
          : l,
      ),
    );
  };

  const duplicateLot = (lineKey: string) => {
    const source = lots.find((l) => l.lineKey === lineKey);
    if (!source) return;
    setLots((prev) => [
      ...prev,
      {
        ...source,
        lineKey: newLineKey(),
        notes: "",
        attributeSelections: { ...source.attributeSelections },
      },
    ]);
  };

  const removeLot = (lineKey: string) => {
    setLots((prev) => prev.filter((l) => l.lineKey !== lineKey));
  };

  const updateLot = (lineKey: string, patch: Partial<LotLine>) => {
    setLots((prev) =>
      prev.map((l) => (l.lineKey === lineKey ? { ...l, ...patch } : l)),
    );
  };

  const handleCreate = async () => {
    if (!productionUnitId || !selectedUnit) {
      setError("Seleccione una unidad de producción");
      return;
    }
    if (!selectedUnit.defaultInputStorageId) {
      setError("La unidad debe tener almacén de insumos");
      return;
    }
    if (!outputStorageId) {
      setError("Seleccione almacén de salida");
      return;
    }
    const branchId = resolveBranchId();
    if (!branchId) {
      setError("No se pudo resolver la sucursal desde la unidad o sus almacenes");
      return;
    }
    if (lots.length === 0) {
      setError("Agregue al menos un lote desde el buscador");
      return;
    }
    for (const lot of lots) {
      const qty = Number(lot.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError(`Cantidad inválida en ${lot.sku}`);
        return;
      }
      if (lot.attrsLoading) {
        setError("Espere a que carguen los atributos de producción");
        return;
      }
      for (const attr of lot.attributes) {
        if (attr.options.length > 0 && !lot.attributeSelections[attr.id]) {
          setError(`Seleccione ${attr.name} en ${lot.sku}`);
          return;
        }
      }
    }

    setSaving(true);
    setError(null);
    const capacityNum = capacity.trim() === "" ? null : Number(capacity);
    const result = await createProductionBatchAction({
      branchId,
      storageId: selectedUnit.defaultInputStorageId,
      outputStorageId,
      productionUnitId,
      capacity:
        capacityNum != null && Number.isFinite(capacityNum) ? capacityNum : null,
      plannedStartAt: plannedStartAt.trim() || null,
      plannedDeliveryAt: plannedDeliveryAt.trim() || null,
      notes: headerNotes.trim() || undefined,
      lots: lots.map((lot) => ({
        lineKey: lot.lineKey,
        productVariantId: lot.variantId,
        productName: `${lot.productName} (${lot.sku})`,
        quantity: Number(lot.quantity),
        notes: lot.notes.trim() || undefined,
        attributes: lot.attributes
          .filter((a) => lot.attributeSelections[a.id])
          .map((a) => ({
            attributeId: a.id,
            optionId: lot.attributeSelections[a.id],
          })),
      })),
    });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    router.push(`/production/orders/${result.batch.id}`);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 p-4"
      data-test-id="create-production-form"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Nueva orden de manufactura</h1>
        <div className="flex gap-2">
          <Button
            variant="outlined"
            onClick={() => router.push("/production/orders")}
          >
            Volver
          </Button>
          <Button
            variant="primary"
            disabled={
              saving || !productionUnitId || !outputStorageId || lots.length === 0
            }
            onClick={() => void handleCreate()}
            data-test-id="production-create-submit"
          >
            Crear orden
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-start">
        <ManufactureVariantSearchPanel
          productionUnitId={productionUnitId || null}
          onAddVariant={(item) => void addLotFromVariant(item)}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <section className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-2">
            <Select
              label="Unidad de producción"
              value={productionUnitId || null}
              onChange={(v) => setProductionUnitId(v ? String(v) : "")}
              options={batchUnits.map((u) => ({
                id: u.id,
                label: `${u.name} (${u.code})`,
              }))}
              data-test-id="production-unit-select"
            />
            <Select
              label="Almacén de salida"
              value={outputStorageId || null}
              onChange={(v) => setOutputStorageId(v ? String(v) : "")}
              options={outputStorageOptions}
              data-test-id="production-output-storage"
            />
            <TextField
              label="Capacidad planificada (orden)"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Opcional"
              data-test-id="production-capacity"
            />
            <TextField
              label="Fecha de inicio"
              type="datetime-local"
              value={plannedStartAt}
              onChange={(e) => setPlannedStartAt(e.target.value)}
              data-test-id="production-planned-start"
            />
            <TextField
              label="Fecha de entrega"
              type="datetime-local"
              value={plannedDeliveryAt}
              onChange={(e) => setPlannedDeliveryAt(e.target.value)}
              data-test-id="production-planned-delivery"
            />
            <div className="rounded-md bg-muted/20 p-2 text-sm sm:col-span-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Almacén insumos</p>
                  <p className="font-medium">
                    {storageLabel(selectedUnit?.defaultInputStorageId)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">MO / pieza (celda)</p>
                  <p className="font-medium tabular-nums">
                    {selectedUnit?.laborCostPerUnit != null
                      ? formatMoney(selectedUnit.laborCostPerUnit)
                      : "— (historial o override)"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3" data-test-id="production-lots">
            <h2 className="text-sm font-medium">
              Lotes a producir ({lots.length})
            </h2>
            {lots.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Use el buscador de la izquierda para agregar variantes. La misma
                variante puede agregarse varias veces con distintos atributos.
              </p>
            ) : (
              lots.map((lot) => {
                const preview = costByVariant[lot.variantId];
                const qty = Number(lot.quantity);
                const qtyOk = Number.isFinite(qty) && qty > 0;
                const matU = preview?.materialsPerUnit ?? null;
                const moU = preview?.laborPerUnit ?? null;
                const unitPreview = preview?.unitCostPreview ?? null;
                return (
                  <div
                    key={lot.lineKey}
                    className="flex flex-col gap-3 rounded-xl border border-border p-3"
                    data-test-id={`production-lot-${lot.lineKey}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{lot.productName}</p>
                        <p className="text-sm text-muted-foreground">{lot.sku}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outlined"
                          onClick={() => duplicateLot(lot.lineKey)}
                        >
                          Duplicar
                        </Button>
                        <Button
                          type="button"
                          variant="outlined"
                          onClick={() => removeLot(lot.lineKey)}
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>

                    <TextField
                      label="Cantidad del lote"
                      type="number"
                      value={lot.quantity}
                      onChange={(e) =>
                        updateLot(lot.lineKey, { quantity: e.target.value })
                      }
                    />

                    <div
                      className="rounded-md bg-muted/15 p-2 text-xs tabular-nums"
                      data-test-id={`production-lot-cost-${lot.lineKey}`}
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-muted-foreground">Materiales/u</p>
                          <p className="font-medium">{formatMoney(matU)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">MO/u</p>
                          <p className="font-medium">{formatMoney(moU)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Costo/u est.</p>
                          <p className="font-medium">{formatMoney(unitPreview)}</p>
                        </div>
                      </div>
                      {qtyOk && unitPreview != null ? (
                        <p className="mt-1 text-muted-foreground">
                          Lote est.: {formatMoney(unitPreview * qty)}
                          {matU != null || moU != null
                            ? ` (mat ${formatMoney((matU ?? 0) * qty)} + MO ${formatMoney((moU ?? 0) * qty)})`
                            : ""}
                        </p>
                      ) : null}
                      {preview?.laborWarning || preview?.materialsWarning ? (
                        <p className="mt-1 text-amber-700 dark:text-amber-400">
                          {[preview.laborWarning, preview.materialsWarning]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>

                    {lot.attrsLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Cargando atributos…
                      </p>
                    ) : lot.attributes.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {lot.attributes.map((attr) => (
                          <Select
                            key={attr.id}
                            label={attr.name}
                            value={lot.attributeSelections[attr.id] || null}
                            onChange={(v) =>
                              updateLot(lot.lineKey, {
                                attributeSelections: {
                                  ...lot.attributeSelections,
                                  [attr.id]: v ? String(v) : "",
                                },
                              })
                            }
                            options={attr.options.map((o) => ({
                              id: o.id,
                              label: o.label,
                            }))}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sin atributos de producción
                      </p>
                    )}

                    <TextField
                      label="Notas del lote"
                      value={lot.notes}
                      onChange={(e) =>
                        updateLot(lot.lineKey, { notes: e.target.value })
                      }
                    />
                  </div>
                );
              })
            )}
          </section>

          <TextField
            label="Notas de la orden"
            value={headerNotes}
            onChange={(e) => setHeaderNotes(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
