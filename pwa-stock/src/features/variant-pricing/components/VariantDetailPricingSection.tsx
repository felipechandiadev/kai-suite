"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Alert, IconButton } from "@kai/ui";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";
import type { VariantDetail } from "@/features/variant/types/variant.types";
import {
  listPriceListsForStockAction,
  listTaxesForStockAction,
  updateVariantPricingAction,
} from "../actions/variant-pricing.action";
import { catalogDefaultIvaTaxIds } from "../lib/catalog-default-iva";
import {
  deriveBasePriceFromPriceRows,
  effectiveIvaFactor,
  netToGross,
  roundMoneyInt,
} from "../lib/price-tax-math";
import type { VariantPriceListItem } from "../types/pricing.types";
import type { PriceListListItem } from "../types/price-list.types";
import type { TaxListItem } from "../types/tax.types";
import {
  priceListItemToRow,
  rowToPriceListItem,
  type VariantPriceRowDraft,
} from "../lib/variant-price-row";
import { VariantPriceListCard } from "./VariantPriceListCard";
import { VariantPriceRowDialog } from "./VariantPriceRowDialog";
import { VariantPmpPriceCalculatorDialog } from "./VariantPmpPriceCalculatorDialog";

type Props = {
  variant: VariantDetail;
  onPricingChanged?: () => void;
};

export function VariantDetailPricingSection({ variant, onPricingChanged }: Props) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [priceLists, setPriceLists] = useState<PriceListListItem[]>([]);
  const [taxes, setTaxes] = useState<TaxListItem[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [savingListId, setSavingListId] = useState<string | null>(null);
  const [draftRow, setDraftRow] = useState<VariantPriceRowDraft | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const ivaTaxes = useMemo(
    () => taxes.filter((t) => t.isActive && t.taxType === "IVA"),
    [taxes],
  );
  const defaultIvaTaxIds = useMemo(() => catalogDefaultIvaTaxIds(taxes), [taxes]);
  const activePriceLists = useMemo(
    () => priceLists.filter((p) => p.isActive),
    [priceLists],
  );

  const pricedIds = useMemo(
    () => new Set((variant.priceListItems ?? []).map((p) => p.priceListId)),
    [variant.priceListItems],
  );

  const canAddPrice = useMemo(() => {
    if (activePriceLists.length === 0) {
      return false;
    }
    return activePriceLists.some((pl) => !pricedIds.has(pl.id));
  }, [activePriceLists, pricedIds]);

  const missingPriceLists = useMemo(
    () => activePriceLists.filter((pl) => !pricedIds.has(pl.id)),
    [activePriceLists, pricedIds],
  );

  useEffect(() => {
    if (editingListId && !variant.priceListItems?.some((p) => p.priceListId === editingListId)) {
      setEditingListId(null);
      setDraftRow(null);
      setSavingListId(null);
      setCardError(null);
    }
  }, [variant.priceListItems, editingListId]);

  useEffect(() => {
    void (async () => {
      const [pls, txs] = await Promise.all([
        listPriceListsForStockAction(),
        listTaxesForStockAction(),
      ]);
      if (pls.success) {
        setPriceLists(pls.priceLists);
        if (!pls.priceLists.some((p) => p.isActive)) {
          setLoadError("No hay listas de precios activas.");
        } else {
          setLoadError(null);
        }
      } else {
        setLoadError(pls.error);
      }
      if (txs.success) {
        setTaxes(txs.taxes);
      } else if (!pls.success) {
        setLoadError((prev) => prev ?? txs.error);
      }
      setCatalogLoaded(true);
    })();
  }, []);

  const persistItems = useCallback(
    (
      nextItems: VariantPriceListItem[],
      opts?: { savingId?: string; onSuccess?: () => void },
    ) => {
      const productId = variant.productId?.trim() ?? "";
      const vid = variant.variantId.trim();
      if (!productId || !vid) {
        const msg = "Datos de variante incompletos.";
        setActionError(msg);
        setCardError(msg);
        return;
      }
      const rows = nextItems.map((item) => ({
        priceListId: item.priceListId,
        net: item.netPrice,
      }));
      const basePrice = deriveBasePriceFromPriceRows(rows);
      if (basePrice === null) {
        const msg = "No se pudo determinar el precio de referencia.";
        setActionError(msg);
        setCardError(msg);
        return;
      }

      if (opts?.savingId) {
        setSavingListId(opts.savingId);
      }

      startTransition(() => {
        void (async () => {
          setActionError(null);
          setCardError(null);
          setDialogError(null);
          const r = await updateVariantPricingAction(vid, {
            productId,
            basePrice,
            priceListItems: nextItems.map((item) => ({
              priceListId: item.priceListId,
              netPrice: item.netPrice,
              grossPrice: item.grossPrice,
              taxIds: item.taxIds,
              maxDiscountPercent: item.maxDiscountPercent,
              minPrice: item.minPrice,
            })),
          });
          setSavingListId(null);
          if (!r.success && handleUnauthorizedClient(r)) {
            return;
          }
          if (!r.success) {
            setActionError(r.error);
            setCardError(r.error);
            setDialogError(r.error);
            return;
          }
          setEditingListId(null);
          setDraftRow(null);
          setAddOpen(false);
          setCalculatorOpen(false);
          opts?.onSuccess?.();
          onPricingChanged?.();
        })();
      });
    },
    [variant.productId, variant.variantId, onPricingChanged],
  );

  const startEdit = useCallback(
    (item: VariantPriceListItem) => {
      if (pending) {
        return;
      }
      setActionError(null);
      setCardError(null);
      setEditingListId(item.priceListId);
      setDraftRow(priceListItemToRow(item, defaultIvaTaxIds));
      setCalculatorOpen(false);
    },
    [pending, defaultIvaTaxIds],
  );

  const saveEdit = useCallback(() => {
    if (!draftRow || !editingListId) {
      return;
    }
    const item = (variant.priceListItems ?? []).find((p) => p.priceListId === editingListId);
    const list = priceLists.find((p) => p.id === editingListId);
    const updated = rowToPriceListItem(
      draftRow,
      list?.name ?? item?.priceListName ?? "Lista",
      list?.currency ?? item?.currency ?? "CLP",
    );
    const current = variant.priceListItems ?? [];
    const next = [
      ...current.filter((p) => p.priceListId !== editingListId),
      updated,
    ].sort((a, b) =>
      a.priceListName.localeCompare(b.priceListName, "es", { sensitivity: "base" }),
    );
    persistItems(next, { savingId: editingListId });
  }, [draftRow, editingListId, priceLists, variant.priceListItems, persistItems]);

  const mergeAndSaveNew = useCallback(
    (row: VariantPriceRowDraft) => {
      const list = priceLists.find((p) => p.id === row.priceListId);
      const updated = rowToPriceListItem(row, list?.name ?? "Lista", list?.currency ?? "CLP");
      const next = [...(variant.priceListItems ?? []), updated].sort((a, b) =>
        a.priceListName.localeCompare(b.priceListName, "es", { sensitivity: "base" }),
      );
      persistItems(next);
    },
    [priceLists, variant.priceListItems, persistItems],
  );

  const handleCalculatorApply = useCallback(
    (_pmp: number, net: number, maxDiscountPercent: number, minPrice: number | null) => {
      if (!draftRow) {
        return;
      }
      const f = effectiveIvaFactor(ivaTaxes, draftRow.taxIds);
      const n = roundMoneyInt(net);
      setDraftRow({
        ...draftRow,
        net: n,
        gross: netToGross(n, f),
        maxDiscountPercent: maxDiscountPercent > 0 ? maxDiscountPercent : null,
        minPrice,
        lastEdited: "net",
      });
      setCalculatorOpen(false);
    },
    [draftRow, ivaTaxes],
  );

  const items = variant.priceListItems ?? [];

  return (
    <section className="flex flex-col gap-3" data-test-id="variant-section-pricing">
      <div className="flex flex-wrap items-center gap-2">
        {canAddPrice ? (
          <IconButton
            icon="Plus"
            variant="action"
            size="sm"
            ariaLabel="Agregar precio en lista"
            disabled={pending || !catalogLoaded || Boolean(loadError) || Boolean(editingListId)}
            onClick={() => {
              setDialogError(null);
              setAddOpen(true);
            }}
            data-test-id="variant-pricing-add"
          />
        ) : null}
        <h2 className="text-sm font-semibold text-foreground">Precios</h2>
      </div>

      {loadError ? <Alert variant="error">{loadError}</Alert> : null}
      {actionError && !editingListId && !addOpen ? (
        <Alert variant="error">{actionError}</Alert>
      ) : null}

      {!catalogLoaded ? (
        <p className="text-sm text-muted-foreground">Cargando precios…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin precios por lista.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const isEditing = editingListId === item.priceListId;
            const isSaving = savingListId === item.priceListId && pending;
            return (
              <VariantPriceListCard
                key={item.priceListId}
                item={item}
                editing={isEditing}
                saving={isSaving}
                controlsDisabled={
                  (editingListId != null && editingListId !== item.priceListId) ||
                  (pending && !isEditing)
                }
                row={isEditing ? draftRow : null}
                ivaTaxes={ivaTaxes}
                cardError={isEditing ? cardError : null}
                onRowChange={setDraftRow}
                onEdit={() => startEdit(item)}
                onSave={saveEdit}
                onCalculator={() => setCalculatorOpen(true)}
              />
            );
          })}
        </div>
      )}

      <VariantPriceRowDialog
        open={addOpen}
        mode="add"
        title="Agregar precio"
        priceListOptions={missingPriceLists}
        initialRow={null}
        ivaTaxes={ivaTaxes}
        defaultIvaTaxIds={defaultIvaTaxIds}
        saving={pending && !editingListId}
        error={dialogError}
        onClose={() => {
          if (!pending) {
            setAddOpen(false);
            setDialogError(null);
          }
        }}
        onSave={(row) => mergeAndSaveNew(row)}
      />

      <VariantPmpPriceCalculatorDialog
        open={calculatorOpen && editingListId != null}
        onClose={() => {
          if (!pending) {
            setCalculatorOpen(false);
          }
        }}
        initialPmp={
          variant.pmp != null && Number.isFinite(variant.pmp) ? Math.max(0, Math.round(variant.pmp)) : 0
        }
        taxIdsForPreview={draftRow?.taxIds ?? defaultIvaTaxIds}
        ivaTaxes={ivaTaxes}
        onApply={handleCalculatorApply}
      />
    </section>
  );
}
