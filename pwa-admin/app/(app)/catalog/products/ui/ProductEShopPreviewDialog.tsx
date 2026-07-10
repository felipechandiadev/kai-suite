"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import type { ProductGridRow } from "@/features/inventory-products/types/product-grid.types";
import { EShopProductDetailPreview } from "@/features/eshop-preview/components/EShopProductDetailPreview";
import { getEShopCatalogProductPreviewAction } from "@/features/eshop-preview/actions/eshop-preview.action";
import type { EShopCatalogProductDetail } from "@/features/eshop-preview/types/catalog-product.types";

type Props = {
  open: boolean;
  product: ProductGridRow | null;
  onClose: () => void;
};

export function ProductEShopPreviewDialog({ open, product, onClose }: Props) {
  const [detail, setDetail] = useState<EShopCatalogProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product) {
      setDetail(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void getEShopCatalogProductPreviewAction(product.id).then((r) => {
      if (cancelled) {
        return;
      }
      if (r.success) {
        setDetail(r.detail);
        setLoadError(null);
      } else {
        setDetail(null);
        setLoadError(r.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, product]);

  const hiddenVariantCount =
    product != null
      ? (product.variants ?? []).filter((v) => v.visibleInEShop !== true).length
      : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Vista previa eShop"
      size="xxl"
      scroll="paper"
      hideActions
      showCloseButton
      data-test-id="product-eshop-preview-dialog"
      alertArea={
        loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : detail == null && !loading ? (
          <p className="text-sm text-destructive">
            Este producto no tiene variantes visibles en eShop. Activa al menos una variante para publicar.
          </p>
        ) : hiddenVariantCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {hiddenVariantCount} variante{hiddenVariantCount === 1 ? "" : "s"} oculta
            {hiddenVariantCount === 1 ? "" : "s"} en eShop (no se muestran en la preview).
          </p>
        ) : null
      }
    >
      {loading ? (
        <LoadingState className="flex items-center justify-center py-4" label="Cargando vista previa" />
      ) : detail ? (
        <EShopProductDetailPreview detail={detail} />
      ) : null}
    </Dialog>
  );
}
