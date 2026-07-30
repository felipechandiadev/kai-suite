"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { StockGridRow } from "@/features/inventory-stock/types/stock-grid.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { getProductVariantDetailForPage } from "@/features/inventory-products/actions/product.action";
import { saveVariantStockConfigAction } from "@/features/inventory-stock/actions/stock.action";
import {
  mergeStoragesForThresholds,
  numToThresholdInput,
  storageDraftsFromBreakdown,
  storageThresholdsPayloadFromDrafts,
  type StorageThresholdDraft,
  type VariantThresholdDraft,
} from "@/features/inventory-stock/lib/variant-stock-threshold-config";
import {
  StorageThresholdField,
  VariantThresholdField,
} from "@/features/inventory-stock/components/VariantStockThresholdFields";

export type EditVariantStockConfigDialogProps = {
  open: boolean;
  row: StockGridRow | null;
  storages: StorageListItem[];
  branchId?: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function EditVariantStockConfigDialog({
  open,
  row,
  storages,
  branchId,
  onClose,
  onSaved,
}: EditVariantStockConfigDialogProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [productType, setProductType] = useState<string | null>(null);
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

  const subtitle = useMemo(() => {
    if (!row) {
      return "";
    }
    const parts = [row.productName, row.sku ? `SKU ${row.sku}` : ""].filter(Boolean);
    return parts.join(" · ");
  }, [row]);

  useEffect(() => {
    if (!open || !row) {
      return;
    }
    let cancelled = false;
    setLoadError(null);
    setSaveError(null);
    setLoading(true);
    void (async () => {
      const r = await getProductVariantDetailForPage(row.variantId);
      if (cancelled) {
        return;
      }
      if (!r.ok) {
        setLoadError(r.error);
        setLoading(false);
        return;
      }
      const v = r.variant;
      const pt = r.product.productType;
      setProductType(pt);
      const isService = String(pt || "").toUpperCase() === "SERVICE";
      setTrackInventory(typeof v.trackInventory === "boolean" ? v.trackInventory : !isService);
      setAllowNegativeStock(v.allowNegativeStock === true);
      setMinimumDraft({
        enabled: v.minimumStockEnabled === true,
        value: numToThresholdInput(v.minimumStock) || "0",
      });
      setMaximumDraft({
        enabled: v.maximumStockEnabled === true,
        value: numToThresholdInput(v.maximumStock) || "0",
      });
      setReorderDraft({
        enabled: v.reorderPointEnabled === true,
        value: numToThresholdInput(v.reorderPoint) || "0",
      });

      const merged = mergeStoragesForThresholds(storages, row.storageBreakdown ?? [], branchId);
      setStorageDrafts(storageDraftsFromBreakdown(merged));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row, storages, branchId]);

  const handleClose = () => {
    if (isPending) {
      return;
    }
    setSaveError(null);
    onClose();
  };

  const handleSave = () => {
    if (!row) {
      return;
    }
    setSaveError(null);
    const minVal = Math.max(0, Math.round(Number(minimumDraft.value) || 0));
    const maxVal = Math.max(0, Math.round(Number(maximumDraft.value) || 0));
    const reorderVal = Math.max(0, Math.round(Number(reorderDraft.value) || 0));

    startTransition(() => {
      void (async () => {
        const r = await saveVariantStockConfigAction({
          variantId: row.variantId,
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
        if (r.success) {
          await onSaved();
          handleClose();
        } else {
          setSaveError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Configuración de stock"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="stock-config-dialog"
      alertArea={
        loadError || saveError ? (
          <Alert variant="error" data-test-id="stock-config-error">
            {loadError ?? saveError}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" disabled={isPending || loading} onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={isPending || loading || Boolean(loadError)}
            onClick={handleSave}
            data-test-id="stock-config-save"
          >
            Guardar
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingState className="flex items-center justify-center py-4" label="Cargando variante" />
      ) : row ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">{subtitle}</p>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Variante (valores por defecto)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Switch
                checked={trackInventory}
                onChange={setTrackInventory}
                label="Controlar inventario"
                labelPosition="right"
                disabled={String(productType || "").toUpperCase() === "SERVICE"}
                data-test-id="stock-config-track"
              />
              <Switch
                checked={allowNegativeStock}
                onChange={setAllowNegativeStock}
                label="Permitir stock negativo"
                labelPosition="right"
                data-test-id="stock-config-negative"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Active cada umbral con el interruptor; el valor solo aplica si está habilitado.
            </p>
            <div className="grid gap-3">
              <VariantThresholdField
                label="Stock mínimo"
                name="stock-config-min"
                draft={minimumDraft}
                onChange={setMinimumDraft}
                data-test-id="stock-config-min"
              />
              <VariantThresholdField
                label="Stock máximo"
                name="stock-config-max"
                draft={maximumDraft}
                onChange={setMaximumDraft}
                data-test-id="stock-config-max"
              />
              <VariantThresholdField
                label="Punto de reposición"
                name="stock-config-reorder"
                draft={reorderDraft}
                onChange={setReorderDraft}
                data-test-id="stock-config-reorder"
              />
            </div>
          </div>

          {storageDrafts.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Por almacén (opcional)
              </p>
              <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {storageDrafts.map((s, idx) => (
                  <div
                    key={s.storageId}
                    className="rounded-lg border border-border bg-muted/20 p-3"
                    data-test-id={`stock-config-storage-${s.storageId}`}
                  >
                    <p className="mb-2 text-sm font-medium text-foreground">{s.storageName}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <StorageThresholdField
                        label="Mín."
                        name={`st-min-${s.storageId}`}
                        draft={s.minimum}
                        variantDraft={minimumDraft}
                        onChange={(next) => {
                          setStorageDrafts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, minimum: next } : x)),
                          );
                        }}
                        dataTestId={`st-min-${s.storageId}`}
                      />
                      <StorageThresholdField
                        label="Máx."
                        name={`st-max-${s.storageId}`}
                        draft={s.maximum}
                        variantDraft={maximumDraft}
                        onChange={(next) => {
                          setStorageDrafts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, maximum: next } : x)),
                          );
                        }}
                        dataTestId={`st-max-${s.storageId}`}
                      />
                      <StorageThresholdField
                        label="Repos."
                        name={`st-reorder-${s.storageId}`}
                        draft={s.reorder}
                        variantDraft={reorderDraft}
                        onChange={(next) => {
                          setStorageDrafts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, reorder: next } : x)),
                          );
                        }}
                        dataTestId={`st-reorder-${s.storageId}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
