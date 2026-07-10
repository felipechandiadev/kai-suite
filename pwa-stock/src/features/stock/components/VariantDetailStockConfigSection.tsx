"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, IconButton, Switch, TextField } from "@kai/ui";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";
import type { VariantDetail } from "@/features/variant/types/variant.types";
import {
  fetchVariantStockBreakdownAction,
  saveVariantStockConfigAction,
} from "../actions/stock.action";
import { VariantDetailStorageThresholdsBlock } from "./VariantDetailStorageThresholdsBlock";
import {
  formatThresholdReadOnly,
  VariantThresholdField,
} from "./VariantStockThresholdFields";
import {
  numToThresholdInput,
  storageDraftsFromBreakdown,
  storageThresholdsPayloadFromDrafts,
  type StorageThresholdDraft,
  type VariantThresholdDraft,
} from "../lib/variant-stock-threshold-config";

type Props = {
  variant: VariantDetail;
  onConfigChanged?: () => void;
};

function sectionClass(editing: boolean): string {
  return editing
    ? "relative rounded-lg border border-primary/40 bg-muted/10 p-4"
    : "relative rounded-lg border border-border p-4";
}

export function VariantDetailStockConfigSection({ variant, onConfigChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [breakdownReloadKey, setBreakdownReloadKey] = useState(0);

  const isService = String(variant.productType || "").toUpperCase() === "SERVICE";

  const [trackInventory, setTrackInventory] = useState(true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [minimumDraft, setMinimumDraft] = useState<VariantThresholdDraft>({
    enabled: false,
    value: "0",
  });
  const [maximumDraft, setMaximumDraft] = useState<VariantThresholdDraft>({
    enabled: false,
    value: "0",
  });
  const [reorderDraft, setReorderDraft] = useState<VariantThresholdDraft>({
    enabled: false,
    value: "0",
  });
  const [storageDrafts, setStorageDrafts] = useState<StorageThresholdDraft[]>([]);

  const thresholdsDisabled = !trackInventory || isService;

  useEffect(() => {
    if (editing) {
      return;
    }
    setTrackInventory(
      typeof variant.trackInventory === "boolean" ? variant.trackInventory : !isService,
    );
    setAllowNegativeStock(variant.allowNegativeStock === true);
    setMinimumDraft({
      enabled: variant.minimumStockEnabled === true,
      value: numToThresholdInput(variant.minimumStock) || "0",
    });
    setMaximumDraft({
      enabled: variant.maximumStockEnabled === true,
      value: numToThresholdInput(variant.maximumStock) || "0",
    });
    setReorderDraft({
      enabled: variant.reorderPointEnabled === true,
      value: numToThresholdInput(variant.reorderPoint) || "0",
    });
  }, [variant, isService, editing]);

  const displayTrack = useMemo(
    () => (variant.trackInventory !== false ? "Sí" : "No"),
    [variant.trackInventory],
  );
  const displayNeg = useMemo(
    () => (variant.allowNegativeStock ? "Sí" : "No"),
    [variant.allowNegativeStock],
  );

  const beginEdit = () => {
    setError(null);
    const vid = variant.variantId.trim();
    const sku = variant.sku.trim();
    setEditing(true);
    void (async () => {
      const r = await fetchVariantStockBreakdownAction({ variantId: vid, sku });
      if (r.ok) {
        setStorageDrafts(storageDraftsFromBreakdown(r.breakdown));
      }
    })();
  };

  const cancelEdit = () => {
    if (pending) {
      return;
    }
    setError(null);
    setEditing(false);
  };

  const save = () => {
    setError(null);
    const vid = variant.variantId.trim();
    if (!vid) {
      setError("Variante no válida");
      return;
    }
    const minVal = Math.max(0, Math.round(Number(minimumDraft.value) || 0));
    const maxVal = Math.max(0, Math.round(Number(maximumDraft.value) || 0));
    const reorderVal = Math.max(0, Math.round(Number(reorderDraft.value) || 0));

    startTransition(() => {
      void (async () => {
        const r = await saveVariantStockConfigAction({
          variantId: vid,
          trackInventory,
          allowNegativeStock,
          minimumStock: minVal,
          minimumStockEnabled: minimumDraft.enabled,
          maximumStock: maxVal,
          maximumStockEnabled: maximumDraft.enabled,
          reorderPoint: reorderVal,
          reorderPointEnabled: reorderDraft.enabled,
          storageThresholds: storageThresholdsPayloadFromDrafts(storageDrafts),
        });
        if (!r.success) {
          if (handleUnauthorizedClient(r)) {
            return;
          }
          setError(r.error);
          return;
        }
        setEditing(false);
        setBreakdownReloadKey((k) => k + 1);
        onConfigChanged?.();
      })();
    });
  };

  const toggleEditOrSave = () => {
    if (editing) {
      save();
      return;
    }
    beginEdit();
  };

  return (
    <section className="flex flex-col gap-3" data-test-id="variant-stock-config-section">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Configuración de inventario</h2>
        <div className="flex items-center gap-1">
          {editing ? (
            <IconButton
              icon="X"
              variant="ghost"
              size="sm"
              ariaLabel="Cancelar edición"
              disabled={pending}
              onClick={cancelEdit}
              data-test-id="variant-stock-config-cancel"
            />
          ) : null}
          <IconButton
            icon={editing ? "Check" : "Pencil"}
            variant="action"
            size="sm"
            ariaLabel={editing ? "Guardar configuración" : "Editar configuración"}
            disabled={pending}
            onClick={toggleEditOrSave}
            data-test-id="variant-stock-config-edit-save"
          />
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className={sectionClass(editing)}>
      {!editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Control de inventario"
            name="variant-stock-config-track-ro"
            value={displayTrack}
            onChange={() => {}}
            readOnly
            data-test-id="variant-stock-config-track-ro"
          />
          <TextField
            label="Stock negativo"
            name="variant-stock-config-neg-ro"
            value={displayNeg}
            onChange={() => {}}
            readOnly
            data-test-id="variant-stock-config-neg-ro"
          />
          <TextField
            label="Stock mínimo"
            name="variant-stock-config-min-ro"
            value={formatThresholdReadOnly(variant.minimumStockEnabled, variant.minimumStock)}
            onChange={() => {}}
            readOnly
            data-test-id="variant-stock-config-min-ro"
          />
          <TextField
            label="Stock máximo"
            name="variant-stock-config-max-ro"
            value={formatThresholdReadOnly(variant.maximumStockEnabled, variant.maximumStock)}
            onChange={() => {}}
            readOnly
            data-test-id="variant-stock-config-max-ro"
          />
          <TextField
            label="Punto de reposición"
            name="variant-stock-config-reorder-ro"
            value={formatThresholdReadOnly(variant.reorderPointEnabled, variant.reorderPoint)}
            onChange={() => {}}
            readOnly
            data-test-id="variant-stock-config-reorder-ro"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Switch
              checked={trackInventory}
              onChange={setTrackInventory}
              label="Controlar inventario"
              labelPosition="right"
              disabled={isService}
              data-test-id="variant-stock-config-track"
            />
            <Switch
              checked={allowNegativeStock}
              onChange={setAllowNegativeStock}
              label="Permitir stock negativo"
              labelPosition="right"
              data-test-id="variant-stock-config-negative"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Active cada umbral con el interruptor; el valor solo aplica si está habilitado.
          </p>
          <div className="grid gap-3 sm:grid-cols-1">
            <VariantThresholdField
              label="Stock mínimo"
              name="variant-stock-config-min"
              draft={minimumDraft}
              onChange={setMinimumDraft}
              disabled={thresholdsDisabled}
              dataTestId="variant-stock-config-min"
            />
            <VariantThresholdField
              label="Stock máximo"
              name="variant-stock-config-max"
              draft={maximumDraft}
              onChange={setMaximumDraft}
              disabled={thresholdsDisabled}
              dataTestId="variant-stock-config-max"
            />
            <VariantThresholdField
              label="Punto de reposición"
              name="variant-stock-config-reorder"
              draft={reorderDraft}
              onChange={setReorderDraft}
              disabled={thresholdsDisabled}
              dataTestId="variant-stock-config-reorder"
            />
          </div>
        </div>
      )}

      <VariantDetailStorageThresholdsBlock
        variantId={variant.variantId}
        sku={variant.sku}
        editing={editing}
        minimumDraft={minimumDraft}
        maximumDraft={maximumDraft}
        reorderDraft={reorderDraft}
        storageDrafts={storageDrafts}
        onStorageDraftsChange={setStorageDrafts}
        reloadKey={breakdownReloadKey}
        thresholdsDisabled={thresholdsDisabled}
      />
      </div>
    </section>
  );
}
