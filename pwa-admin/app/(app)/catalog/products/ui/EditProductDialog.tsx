"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { updateProductAction } from "@/features/inventory-products/actions/product.action";
import type { CatalogProductType, ProductGridRow } from "@/features/inventory-products/types/product-grid.types";
import {
  catalogProductTypeIsSellable,
  getCatalogProductTypeSelectOptions,
  normalizeCatalogProductType,
} from "./catalog-product-type-options";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { listBrandsForPage } from "@/features/catalog-brands/actions/brand.action";
import { MultimediaField } from "@/shared/components/Multimedia";
import { isEShopModuleEnabled } from "@/config/eshop-module.config";

export type EditProductDialogProps = {
  open: boolean;
  product: ProductGridRow | null;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function EditProductDialog({ open, product, onClose, onSuccess }: EditProductDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [visibleInEShop, setVisibleInEShop] = useState(false);
  const eshopModuleOn = isEShopModuleEnabled();
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [brandOptions, setBrandOptions] = useState<Option[]>([]);
  const [productType, setProductType] = useState<CatalogProductType>("PHYSICAL");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !product) {
      return;
    }
    setName(product.name);
    setBrandId(product.brandId ?? null);
    setDescription(product.description ?? "");
    setCategoryId(product.categoryId);
    setIsActive(product.isActive !== false);
    setVisibleInEShop(product.visibleInEShop === true);
    setProductType(normalizeCatalogProductType(product.productType));
    setError(null);
  }, [open, product]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const [list, brands] = await Promise.all([listCategoriesForPage(), listBrandsForPage()]);
      if (cancelled) {
        return;
      }
      setCategoryOptions(list.map((c) => ({ id: c.id, label: c.name })));
      const byId = new Map(brands.map((b) => [b.id, b]));
      const productBrandId = product?.brandId?.trim() || null;
      const selected = productBrandId ? byId.get(productBrandId) : undefined;
      const baseOptions = brands.filter((b) => b.isActive).map((b) => ({ id: b.id, label: b.name }));
      if (selected && !selected.isActive) {
        setBrandOptions([{ id: selected.id, label: `${selected.name} (inactiva)` }, ...baseOptions]);
      } else {
        setBrandOptions(baseOptions);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, product?.id]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!product) {
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateProductAction({
          id: product.id,
          name: name.trim(),
          brandId,
          description: description.trim() || undefined,
          categoryId: categoryId?.trim() || undefined,
          productType,
          isActive,
          visibleInEShop:
            eshopModuleOn && catalogProductTypeIsSellable(productType)
              ? visibleInEShop
              : false,
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const canSubmit = name.trim().length > 0 && !isPending && product != null;

  return (
    <Dialog
      open={open && product != null}
      onClose={handleClose}
      title="Editar producto"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="product-edit-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="product-edit-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="product-edit-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="product-edit-submit">
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="product-edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="product-edit-name"
        />
        <Select
          label="Tipo"
          name="product-edit-type"
          placeholder="Seleccione tipo"
          options={getCatalogProductTypeSelectOptions()}
          value={productType}
          onChange={(id) => setProductType(normalizeCatalogProductType(id == null ? "PHYSICAL" : String(id)))}
          data-test-id="product-edit-type"
        />
        {productType === "SERVICE" ? (
          <div className="rounded-lg border border-border bg-muted/15 p-3 text-xs text-muted-foreground">
            Este producto es un <span className="font-medium text-foreground">servicio</span>. Si consume insumos, defina
            la <span className="font-medium text-foreground">receta</span> en{" "}
            <span className="font-medium text-foreground">Inventario → Productos</span>: expanda el producto, elija la
            variante y use <span className="font-medium text-foreground">Receta</span>.
          </div>
        ) : null}
        <Select
          label="Categoría"
          name="product-edit-category"
          placeholder="Sin categoría"
          options={categoryOptions}
          value={categoryId}
          onChange={(id) => setCategoryId(id == null ? null : String(id))}
          allowClear
          data-test-id="product-edit-category"
        />
        <Select
          label="Marca"
          name="product-edit-brand"
          placeholder="Sin marca"
          options={brandOptions}
          value={brandId}
          onChange={(id) => setBrandId(id == null ? null : String(id))}
          allowClear
          data-test-id="product-edit-brand"
        />
        <TextField
          label="Descripción"
          name="product-edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={3}
          data-test-id="product-edit-description"
        />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="product-edit-active"
          />
          {eshopModuleOn && catalogProductTypeIsSellable(productType) ? (
            <Switch
              checked={visibleInEShop}
              onChange={setVisibleInEShop}
              label="Activo en eShop"
              labelPosition="right"
              data-test-id="product-edit-eshop"
            />
          ) : null}
        </div>
        {product ? (
          <MultimediaField
            mode="persisted"
            layout="collection"
            entityType="product"
            entityId={product.id}
            title="Imágenes del producto (catálogo)"
            allowPrimary
            allowReorder
            onChanged={() => router.refresh()}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
