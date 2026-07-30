"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconButton, SelectDefault as Select } from "@kai/ui";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { readPosFavoriteProducts } from "../lib/pos-favorite-products-storage";
import {
  POS_FAVORITE_BUTTON_SIZE_LABELS,
  POS_FAVORITE_BUTTON_SIZES,
  readPosFavoriteButtonSize,
  writePosFavoriteButtonSize,
  type PosFavoriteButtonSize,
} from "../lib/pos-favorite-quickpick-storage";
import { PosFavoriteProductsDialog } from "./PosFavoriteProductsDialog";
import { PosFavoriteButtonSizePreview } from "./PosFavoriteButtonSizePreview";

export function PosFavoriteProductsSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [posId, setPosId] = useState<string | null>(null);
  const [priceListId, setPriceListId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [buttonSize, setButtonSize] = useState<PosFavoriteButtonSize>(() =>
    readPosFavoriteButtonSize(),
  );

  const sizeOptions = useMemo(
    () =>
      POS_FAVORITE_BUTTON_SIZES.map((size) => ({
        id: size,
        label: POS_FAVORITE_BUTTON_SIZE_LABELS[size],
      })),
    [],
  );

  const refreshCount = useCallback(() => {
    const ctx = readPosContextClient();
    const id = ctx?.pointOfSaleId?.trim() || null;
    setPosId(id);
    setPriceListId(ctx?.priceListId?.trim() || null);
    setBranchId(ctx?.branchId?.trim() || null);
    if (!id) {
      setFavoriteCount(0);
      setConfigError("Configura el punto de venta y abre sesión de caja para administrar favoritos.");
      return;
    }
    if (!ctx?.priceListId?.trim()) {
      setConfigError("Falta la lista de precios del POS en el contexto de sesión.");
      setFavoriteCount(0);
      return;
    }
    setConfigError(null);
    setFavoriteCount(readPosFavoriteProducts(id).length);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (!dialogOpen) {
      refreshCount();
    }
  }, [dialogOpen, refreshCount]);

  const canOpenDialog = Boolean(posId && priceListId);

  function handleButtonSizeChange(id: string | number | null) {
    if (id == null) return;
    const next = String(id) as PosFavoriteButtonSize;
    setButtonSize(next);
    writePosFavoriteButtonSize(next);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {favoriteCount === 0
            ? "Sin favoritos configurados."
            : `${favoriteCount} variante${favoriteCount === 1 ? "" : "s"} en favoritos.`}
        </p>
        <IconButton
          icon="Star"
          variant="outlined"
          size="sm"
          ariaLabel="Administrar favoritos"
          title="Administrar favoritos"
          onClick={() => setDialogOpen(true)}
          disabled={!canOpenDialog}
          className="[&_svg]:text-amber-600"
          data-test-id="pos-settings-favorites-open"
        />
      </div>

      <div className="mt-4 space-y-3">
        <Select
          label="Tamaño de botones en venta"
          name="pos-favorite-button-size"
          value={buttonSize}
          onChange={handleButtonSizeChange}
          options={sizeOptions}
          alwaysShowLabel
          data-test-id="pos-favorite-button-size-select"
        />
        <PosFavoriteButtonSizePreview size={buttonSize} />
      </div>

      {configError ? (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{configError}</p>
      ) : null}

      {canOpenDialog ? (
        <PosFavoriteProductsDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          pointOfSaleId={posId!}
          branchId={branchId}
          priceListId={priceListId!}
        />
      ) : null}
    </>
  );
}
