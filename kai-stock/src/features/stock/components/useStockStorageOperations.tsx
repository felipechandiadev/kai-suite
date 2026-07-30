"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, Select, TextField } from "@kai/ui";
import type { SelectOption as Option } from "@kai/ui";
import type { StockGridRow } from "../types/stock-grid.types";
import type { StorageListItem } from "@/features/stock/types/storage-list.types";
import { adjustStockAction, transferStockAction } from "../actions/stock.action";
import {
  readStockGridCountUnit,
  writeStockGridCountUnit,
} from "../lib/stock-grid-count-unit-storage";
import {
  applyPhysicalDelta,
  countQtyToPhysical,
  effectiveCountInSaleUnits,
  findStorageQuantity,
  formatQty,
  physicalToCountQty,
  roundCountQty,
} from "../lib/stock-unit-display";
import type { StockStorageCardActions } from "./StockStorageCard";

type AdjustState = {
  open: boolean;
  variantId: string;
  storageId: string;
  title: string;
  physicalCurrentQty: number;
  targetQty: string;
  note: string;
  countInSaleUnits: boolean;
  stockUnitSymbol: string;
  saleUnitSymbol: string;
};

type TransferState = {
  open: boolean;
  variantId: string;
  sourceStorageId: string;
  sourceLabel: string;
  quantity: string;
  targetStorageId: string | null;
  note: string;
  countInSaleUnits: boolean;
  stockUnitSymbol: string;
  saleUnitSymbol: string;
};

export type UseStockStorageOperationsOptions = {
  rows: StockGridRow[];
  storages: StorageListItem[];
  onAfterSuccess?: () => void | Promise<void>;
  /** Si false, no persiste preferencia de unidad en localStorage (p. ej. ficha variante). */
  persistCountUnitPreference?: boolean;
};

export function useStockStorageOperations({
  rows,
  storages,
  onAfterSuccess,
  persistCountUnitPreference = true,
}: UseStockStorageOperationsOptions) {
  const router = useRouter();
  const [adjust, setAdjust] = useState<AdjustState | null>(null);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [countInSaleUnits, setCountInSaleUnits] = useState(
    () =>
      typeof window !== "undefined" && persistCountUnitPreference
        ? readStockGridCountUnit() === "sale"
        : true,
  );

  const refresh = useCallback(async () => {
    if (onAfterSuccess) {
      await onAfterSuccess();
    } else {
      await router.refresh();
    }
  }, [onAfterSuccess, router]);

  const handleCountUnitChange = useCallback(
    (saleUnits: boolean) => {
      setCountInSaleUnits(saleUnits);
      if (persistCountUnitPreference) {
        writeStockGridCountUnit(saleUnits ? "sale" : "stock");
      }
    },
    [persistCountUnitPreference],
  );

  const canTransfer = useMemo(
    () => storages.filter((s) => s.isActive !== false).length > 1,
    [storages],
  );

  const openRecount = useCallback(
    (p: { variantId: string; storageId: string; title: string; currentQty: number }) => {
      const row = rows.find((r) => r.variantId === p.variantId);
      const fromGrid = findStorageQuantity(rows, p.variantId, p.storageId);
      const physicalCurrentQty =
        fromGrid !== undefined ? fromGrid : Math.max(0, Number(p.currentQty) || 0);
      const countInSale = effectiveCountInSaleUnits(row, countInSaleUnits);
      const displayQty = countInSale
        ? roundCountQty(physicalToCountQty(physicalCurrentQty, row))
        : roundCountQty(physicalCurrentQty);
      setError(null);
      setAdjust({
        open: true,
        variantId: p.variantId,
        storageId: p.storageId,
        title: p.title,
        physicalCurrentQty,
        targetQty: String(displayQty),
        note: "",
        countInSaleUnits: countInSale,
        stockUnitSymbol: row?.stockUnitSymbol?.trim() || row?.unitOfMeasure?.trim() || "",
        saleUnitSymbol: row?.saleUnitSymbol?.trim() || "",
      });
    },
    [rows, countInSaleUnits],
  );

  const submitQuickDelta = useCallback(
    (p: { variantId: string; storageId: string; currentQty: number; delta: number }) => {
      const row = rows.find((r) => r.variantId === p.variantId);
      const fromGrid = findStorageQuantity(rows, p.variantId, p.storageId);
      const currentQty =
        fromGrid !== undefined ? fromGrid : Math.max(0, Number(p.currentQty) || 0);
      const inSale = effectiveCountInSaleUnits(row, countInSaleUnits);
      const target = applyPhysicalDelta(currentQty, p.delta, row, inSale);
      setError(null);
      void (async () => {
        setIsSaving(true);
        try {
          const r = await adjustStockAction({
            variantId: p.variantId,
            storageId: p.storageId,
            currentQuantity: currentQty,
            targetQuantity: target,
          });
          if (r.success) {
            await refresh();
          } else {
            setError(r.error);
          }
        } finally {
          setIsSaving(false);
        }
      })();
    },
    [rows, countInSaleUnits, refresh],
  );

  useEffect(() => {
    if (!adjust?.open) {
      return;
    }
    const row = rows.find((r) => r.variantId === adjust.variantId);
    const fromGrid = findStorageQuantity(rows, adjust.variantId, adjust.storageId);
    if (fromGrid === undefined || fromGrid === adjust.physicalCurrentQty) {
      return;
    }
    const inSale = effectiveCountInSaleUnits(row, countInSaleUnits);
    const displayQty = inSale
      ? roundCountQty(physicalToCountQty(fromGrid, row))
      : roundCountQty(fromGrid);
    setAdjust((prev) =>
      prev
        ? {
            ...prev,
            physicalCurrentQty: fromGrid,
            targetQty: String(displayQty),
            countInSaleUnits: inSale,
          }
        : null,
    );
  }, [rows, adjust?.open, adjust?.variantId, adjust?.storageId, adjust?.physicalCurrentQty, countInSaleUnits]);

  const openTransfer = useCallback(
    (p: { variantId: string; sourceStorageId: string; sourceLabel: string }) => {
      setError(null);
      const row = rows.find((r) => r.variantId === p.variantId);
      const inSale = effectiveCountInSaleUnits(row, countInSaleUnits);
      const others = storages.filter((s) => s.id !== p.sourceStorageId && s.isActive !== false);
      setTransfer({
        open: true,
        variantId: p.variantId,
        sourceStorageId: p.sourceStorageId,
        sourceLabel: p.sourceLabel,
        quantity: "1",
        targetStorageId: others[0]?.id ?? null,
        note: "",
        countInSaleUnits: inSale,
        stockUnitSymbol: row?.stockUnitSymbol?.trim() || row?.unitOfMeasure?.trim() || "",
        saleUnitSymbol: row?.saleUnitSymbol?.trim() || "",
      });
    },
    [storages, rows, countInSaleUnits],
  );

  const transferTargetOptions: Option[] = useMemo(() => {
    if (!transfer) {
      return [];
    }
    return storages
      .filter((s) => s.id !== transfer.sourceStorageId && s.isActive !== false)
      .map((s) => ({ id: s.id, label: s.name }));
  }, [storages, transfer]);

  const submitAdjust = useCallback(() => {
    if (!adjust) {
      return;
    }
    setError(null);
    const target = Number(String(adjust.targetQty).replace(",", "."));
    if (!Number.isFinite(target) || target < 0) {
      setError("Cantidad objetivo no válida.");
      return;
    }
    const row = rows.find((r) => r.variantId === adjust.variantId);
    const fromGrid = findStorageQuantity(rows, adjust.variantId, adjust.storageId);
    const currentPhysical =
      fromGrid !== undefined ? fromGrid : Math.max(0, Number(adjust.physicalCurrentQty) || 0);
    const targetPhysical = roundCountQty(
      adjust.countInSaleUnits ? countQtyToPhysical(target, row) : target,
    );
    void (async () => {
      setIsSaving(true);
      try {
        const r = await adjustStockAction({
          variantId: adjust.variantId,
          storageId: adjust.storageId,
          currentQuantity: currentPhysical,
          targetQuantity: targetPhysical,
          note: adjust.note.trim() || undefined,
        });
        if (r.success) {
          setAdjust(null);
          await refresh();
        } else {
          setError(r.error);
        }
      } finally {
        setIsSaving(false);
      }
    })();
  }, [adjust, rows, refresh]);

  const submitTransfer = useCallback(() => {
    if (!transfer) {
      return;
    }
    const targetStorageId = transfer.targetStorageId;
    if (!targetStorageId) {
      setError("Seleccione almacén destino.");
      return;
    }
    const qty = Number(String(transfer.quantity).replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Cantidad no válida.");
      return;
    }
    setError(null);
    const row = rows.find((r) => r.variantId === transfer.variantId);
    const physicalQty = transfer.countInSaleUnits
      ? roundCountQty(countQtyToPhysical(qty, row))
      : roundCountQty(qty);
    if (physicalQty <= 0) {
      setError("Cantidad no válida.");
      return;
    }
    void (async () => {
      setIsSaving(true);
      try {
        const r = await transferStockAction({
          variantId: transfer.variantId,
          sourceStorageId: transfer.sourceStorageId,
          targetStorageId,
          quantity: physicalQty,
          note: transfer.note.trim() || undefined,
        });
        if (r.success) {
          setTransfer(null);
          await refresh();
        } else {
          setError(r.error);
        }
      } finally {
        setIsSaving(false);
      }
    })();
  }, [transfer, rows, refresh]);

  const cardActions: StockStorageCardActions = useMemo(
    () => ({
      busy: isSaving,
      countInSaleUnits,
      canTransfer,
      onCountInSaleUnitsChange: handleCountUnitChange,
      onRecount: openRecount,
      onQuickDelta: submitQuickDelta,
      onTransfer: openTransfer,
      onOpenReservations: () => {},
    }),
    [
      isSaving,
      countInSaleUnits,
      canTransfer,
      handleCountUnitChange,
      openRecount,
      submitQuickDelta,
      openTransfer,
    ],
  );

  const inlineError =
    error && !adjust?.open && !transfer?.open ? (
      <Alert variant="error" className="mb-3" data-test-id="stock-storage-inline-error">
        {error}
      </Alert>
    ) : null;

  const operationDialogs = (
    <>
      <Dialog
        open={adjust?.open ?? false}
        onClose={() => {
          if (!isSaving) {
            setError(null);
            setAdjust(null);
          }
        }}
        title="Reconteo"
        size="sm"
        scroll="body"
        data-test-id="stock-adjust-dialog"
        alertArea={
          error && adjust?.open ? (
            <Alert variant="error" data-test-id="stock-adjust-error">
              {error}
            </Alert>
          ) : null
        }
        actions={
          <>
            <Button variant="outlined" size="md" disabled={isSaving} onClick={() => setAdjust(null)}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" disabled={isSaving} onClick={submitAdjust}>
              Guardar
            </Button>
          </>
        }
      >
        {adjust ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{adjust.title}</p>
            <p className="text-xs text-muted-foreground">
              Stock físico actual:{" "}
              <span className="font-mono font-medium text-foreground">
                {formatQty(
                  adjust.countInSaleUnits
                    ? roundCountQty(
                        physicalToCountQty(
                          adjust.physicalCurrentQty,
                          rows.find((r) => r.variantId === adjust.variantId),
                        ),
                      )
                    : adjust.physicalCurrentQty,
                )}
                {adjust.countInSaleUnits && adjust.saleUnitSymbol
                  ? adjust.saleUnitSymbol
                  : adjust.stockUnitSymbol || ""}
              </span>
            </p>
            <TextField
              label={
                adjust.countInSaleUnits && adjust.saleUnitSymbol
                  ? `Nuevo stock físico total (${adjust.saleUnitSymbol})`
                  : `Nuevo stock físico total${adjust.stockUnitSymbol ? ` (${adjust.stockUnitSymbol})` : ""}`
              }
              name="stock-adjust-target"
              selectOnFocus
              value={adjust.targetQty}
              onChange={(e) => setAdjust({ ...adjust, targetQty: e.target.value })}
              data-test-id="stock-adjust-target"
            />
            <TextField
              label="Nota (opcional)"
              name="stock-adjust-note"
              value={adjust.note}
              onChange={(e) => setAdjust({ ...adjust, note: e.target.value })}
              rows={2}
              data-test-id="stock-adjust-note"
            />
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={transfer?.open ?? false}
        onClose={() => {
          if (!isSaving) {
            setError(null);
            setTransfer(null);
          }
        }}
        title="Transferir stock"
        size="sm"
        scroll="body"
        data-test-id="stock-transfer-dialog"
        alertArea={
          error && transfer?.open ? (
            <Alert variant="error" data-test-id="stock-transfer-error">
              {error}
            </Alert>
          ) : null
        }
        actions={
          <>
            <Button variant="outlined" size="md" disabled={isSaving} onClick={() => setTransfer(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={isSaving || !transfer?.targetStorageId}
              onClick={submitTransfer}
            >
              Transferir
            </Button>
          </>
        }
      >
        {transfer ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Desde: {transfer.sourceLabel}</p>
            <TextField
              label={
                transfer.countInSaleUnits && transfer.saleUnitSymbol
                  ? `Cantidad (${transfer.saleUnitSymbol})`
                  : `Cantidad${transfer.stockUnitSymbol ? ` (${transfer.stockUnitSymbol})` : ""}`
              }
              name="stock-transfer-qty"
              type="number"
              min={0.001}
              step={0.001}
              value={transfer.quantity}
              onChange={(e) => setTransfer({ ...transfer, quantity: e.target.value })}
              selectOnFocus
              data-test-id="stock-transfer-qty"
            />
            <Select
              label="Almacén destino"
              name="stock-transfer-target"
              placeholder="Seleccionar"
              options={transferTargetOptions}
              value={transfer.targetStorageId}
              onChange={(id) =>
                setTransfer({ ...transfer, targetStorageId: id == null ? null : String(id) })
              }
              data-test-id="stock-transfer-target"
            />
            <TextField
              label="Nota (opcional)"
              name="stock-transfer-note"
              value={transfer.note}
              onChange={(e) => setTransfer({ ...transfer, note: e.target.value })}
              rows={2}
              data-test-id="stock-transfer-note"
            />
          </div>
        ) : null}
      </Dialog>
    </>
  );

  return {
    isSaving,
    error,
    setError,
    countInSaleUnits,
    canTransfer,
    cardActions,
    inlineError,
    operationDialogs,
    bindCardActions: (onOpenReservations: StockStorageCardActions["onOpenReservations"]) => ({
      ...cardActions,
      onOpenReservations,
    }),
  };
}
