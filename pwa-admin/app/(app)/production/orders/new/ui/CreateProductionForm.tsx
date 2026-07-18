"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, TextField } from "@kai/ui";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { ProductionUnitListItem } from "@/features/inventory-production-units/types/production-unit.types";
import {
  createProductionBatchAction,
  previewRecipeInputsAction,
  searchFinishedVariantsAction,
} from "@/features/inventory-production/actions/production-batch.action";

type Props = {
  branches: BranchListItem[];
  storages: StorageListItem[];
  productionUnits: ProductionUnitListItem[];
};

type VariantOption = {
  variantId: string;
  sku: string;
  productName: string;
  productType: string;
};

export function CreateProductionForm({
  branches,
  storages,
  productionUnits,
}: Props) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [productionUnitId, setProductionUnitId] = useState("");
  const [storageId, setStorageId] = useState("");
  const [outputStorageId, setOutputStorageId] = useState("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [selected, setSelected] = useState<VariantOption | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<
    Array<{ inputVariantId: string; requiredQty: number }> | null
  >(null);
  const [recipeId, setRecipeId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const unitsForBranch = useMemo(() => {
    if (!branchId) return productionUnits.filter((u) => u.isActive);
    return productionUnits.filter(
      (u) =>
        u.isActive &&
        (u.scope === "COMPANY" || u.branchId === branchId),
    );
  }, [productionUnits, branchId]);

  const storageLabel = (id: string) => {
    const s = storages.find((x) => x.id === id);
    return s?.name ?? id;
  };

  useEffect(() => {
    if (!unitsForBranch.some((u) => u.id === productionUnitId)) {
      const first = unitsForBranch[0];
      setProductionUnitId(first?.id ?? "");
      if (first) {
        setStorageId(first.defaultInputStorageId ?? "");
        setOutputStorageId(first.defaultOutputStorageId ?? "");
      } else {
        setStorageId("");
        setOutputStorageId("");
      }
    }
  }, [unitsForBranch, productionUnitId]);

  useEffect(() => {
    const unit = unitsForBranch.find((u) => u.id === productionUnitId);
    if (!unit) return;
    setStorageId(unit.defaultInputStorageId ?? "");
    setOutputStorageId(unit.defaultOutputStorageId ?? "");
  }, [productionUnitId, unitsForBranch]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setSearching(true);
      void searchFinishedVariantsAction(q).then((rows) => {
        if (!cancelled) {
          setOptions(rows);
          setSearching(false);
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const refreshPreview = useCallback(async (variantId: string, qtyRaw: string) => {
    const qty = Number(qtyRaw);
    if (!variantId || !Number.isFinite(qty) || qty <= 0) {
      setPreview(null);
      setRecipeId(undefined);
      return;
    }
    const r = await previewRecipeInputsAction(variantId, qty);
    if (!r.success) {
      setPreview(null);
      setRecipeId(undefined);
      setError(r.message);
      return;
    }
    setError(null);
    setRecipeId(r.recipeId);
    setPreview(r.lines.map((l) => ({ inputVariantId: l.inputVariantId, requiredQty: l.requiredQty })));
  }, []);

  useEffect(() => {
    if (selected) {
      void refreshPreview(selected.variantId, quantity);
    }
  }, [selected, quantity, refreshPreview]);

  const handleCreate = async () => {
    if (!selected) {
      setError("Seleccione un producto terminado");
      return;
    }
    if (!productionUnitId) {
      setError("Seleccione una unidad de producción");
      return;
    }
    if (!storageId || !outputStorageId) {
      setError("La unidad debe tener almacén de insumos y de salida");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Cantidad inválida");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createProductionBatchAction({
      branchId,
      storageId,
      outputStorageId,
      productionUnitId,
      productVariantId: selected.variantId,
      productName: `${selected.productName} (${selected.sku})`,
      quantity: qty,
      notes: notes.trim() || undefined,
      recipeId,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    router.push(`/production/orders/${result.batch.id}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4" data-test-id="create-production-form">
      <h1 className="text-lg font-semibold">Crear producción</h1>

      <Select
        label="Sucursal"
        value={branchId}
        onChange={(v) => setBranchId(String(v))}
        options={branches.map((b) => ({ id: b.id, label: b.name }))}
      />
      <Select
        label="Unidad de producción"
        value={productionUnitId || null}
        onChange={(v) => setProductionUnitId(v ? String(v) : "")}
        options={unitsForBranch.map((u) => ({
          id: u.id,
          label: `${u.name} (${u.code})`,
        }))}
        data-test-id="production-unit-select"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
          <p className="text-muted-foreground">Almacén de insumos</p>
          <p className="font-medium">{storageId ? storageLabel(storageId) : "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
          <p className="text-muted-foreground">Almacén de salida</p>
          <p className="font-medium">
            {outputStorageId ? storageLabel(outputStorageId) : "—"}
          </p>
        </div>
      </div>

      <TextField
        label="Buscar producto terminado"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nombre o SKU (manufacturado, elaborado, preparado)"
        helperText={searching ? "Buscando…" : "Mínimo 2 caracteres"}
        data-test-id="production-variant-search"
      />

      {options.length > 0 ? (
        <ul className="max-h-48 overflow-auto rounded-lg border border-border">
          {options.map((o) => (
            <li key={o.variantId}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted/50"
                onClick={() => {
                  setSelected(o);
                  setQuery(`${o.productName} · ${o.sku}`);
                  setOptions([]);
                }}
              >
                <span className="font-medium">{o.productName}</span>
                <span className="text-muted-foreground">
                  {o.sku} · {o.productType}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected ? (
        <p className="text-sm text-foreground">
          Seleccionado: <strong>{selected.productName}</strong> ({selected.sku})
        </p>
      ) : null}

      <TextField
        label="Cantidad a producir"
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        data-test-id="production-quantity"
      />

      {preview ? (
        <div className="rounded-lg border border-border p-3 text-sm" data-test-id="production-inputs-preview">
          <p className="mb-2 font-medium">Insumos teóricos</p>
          {preview.length === 0 ? (
            <p className="text-muted-foreground">Sin líneas de receta</p>
          ) : (
            <ul className="space-y-1">
              {preview.map((l) => (
                <li key={l.inputVariantId} className="tabular-nums text-muted-foreground">
                  {l.inputVariantId.slice(0, 8)}… → {l.requiredQty}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <TextField
        label="Notas"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="outlined" onClick={() => router.push("/production/orders")}>
          Volver
        </Button>
        <Button
          variant="primary"
          disabled={
            saving ||
            !selected ||
            !branchId ||
            !productionUnitId ||
            !storageId ||
            !outputStorageId
          }
          onClick={() => void handleCreate()}
          data-test-id="production-create-submit"
        >
          Crear producción
        </Button>
      </div>
    </div>
  );
}
