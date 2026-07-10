"use client";

import { useCallback, useEffect, useState } from "react";
import { IconButton } from "@kai/ui";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { readPosFavoriteProducts } from "../lib/pos-favorite-products-storage";
import { PosFavoriteProductsDialog } from "./PosFavoriteProductsDialog";

export function PosFavoriteProductsSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [posId, setPosId] = useState<string | null>(null);
  const [priceListId, setPriceListId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

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
