"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { createProductAction, createProductVariantAction } from "@/features/inventory-products/actions/product.action";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { listBrandsForPage } from "@/features/catalog-brands/actions/brand.action";
import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import { pickDefaultUnit } from "@/features/inventory-units/types/unit.types";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import { deriveBasePriceFromPriceRows, roundMoneyInt } from "@/features/inventory-products/domain/price-tax-math";
import { createVariantPriceRow } from "./VariantPriceRowsEditor";
import { MultimediaField } from "@/shared/components/Multimedia";
import { revalidateMultimediaCachesAction } from "@/features/multimedia/actions/multimedia.action";
import { uploadMultimediaFilesForEntity } from "@/features/multimedia/infrastructure/multimedia.client";
import type { MultimediaEntityType } from "@/features/multimedia/types/multimedia.types";
import { useSession } from "next-auth/react";
import type { CatalogProductType } from "@/features/inventory-products/types/product-grid.types";
import {
  catalogProductTypeIsSellable,
  getCatalogProductTypeSelectOptions,
  normalizeCatalogProductType,
} from "./catalog-product-type-options";
import { isEShopModuleEnabled } from "@/config/eshop-module.config";

async function uploadFilesToEntity(
  files: File[],
  entityType: MultimediaEntityType,
  entityId: string,
  auth: { accessToken?: string | null; activeCompanyId?: string | null },
): Promise<string | null> {
  const r = await uploadMultimediaFilesForEntity({
    files,
    entityType,
    entityId,
    ...auth,
  });
  if (!r.success) {
    return r.error;
  }
  await revalidateMultimediaCachesAction(entityType, entityId);
  return null;
}

import { catalogDefaultIvaTaxIds } from "@/features/inventory-products/lib/sale-taxes";

/** SKU único para la primera variante creada automáticamente al crear el producto. */
function buildInitialSku(productName: string, productId: string): string {
  const slug =
    productName
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "")
      .slice(0, 48) || "ITEM";
  const idPart = productId.replace(/-/g, "").slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 8);
  const sku = `${slug}${idPart}${rand}`;
  return sku.length <= 100 ? sku : sku.slice(0, 100);
}

export type CreateProductDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateProductDialog({ open, onClose, onSuccess }: CreateProductDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const multimediaAuth = {
    accessToken: session?.user?.accessToken,
    activeCompanyId: (session?.user as { activeCompanyId?: string | null } | undefined)?.activeCompanyId,
  };
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [brandOptions, setBrandOptions] = useState<Option[]>([]);
  const [productType, setProductType] = useState<CatalogProductType>("PHYSICAL");
  const [isActive, setIsActive] = useState(true);
  const [visibleInEShop, setVisibleInEShop] = useState(false);
  const eshopModuleOn = isEShopModuleEnabled();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [variantPrepLoading, setVariantPrepLoading] = useState(false);
  const [variantPrepError, setVariantPrepError] = useState<string | null>(null);
  /** Archivos elegidos en el formulario (se suben tras crear el producto al nivel producto). */
  const [stagedProductFiles, setStagedProductFiles] = useState<File[]>([]);
  /** Reinicia previews internos de `MultimediaUploader` al abrir el diálogo. */
  const [mediaStagingKey, setMediaStagingKey] = useState(0);
  /** Errores de subida tras crear el producto (no bloquean el alta). */
  const [postCreateUploadError, setPostCreateUploadError] = useState<string | null>(null);

  const runEnsureFirstVariant = useCallback(
    async (
      productId: string,
      productName: string,
      type: CatalogProductType,
    ): Promise<string | null> => {
      setVariantPrepError(null);
      try {
        const sellable = catalogProductTypeIsSellable(type);
        const [units, priceLists, taxes] = await Promise.all([
          listUnitsForPage(),
          sellable ? listPriceListsForPage() : Promise.resolve([]),
          sellable ? listTaxesForPage() : Promise.resolve([]),
        ]);
        const defaultUnit = pickDefaultUnit(units);
        if (!defaultUnit) {
          setVariantPrepError(
            "No hay unidad de medida activa. Cree una en Inventario → Unidades antes de crear productos.",
          );
          return null;
        }
        let basePrice = 0;
        let priceListItems: Array<{
          priceListId: string;
          netPrice: number;
          grossPrice: number;
          taxIds?: string[];
        }> = [];
        if (sellable) {
          const activePriceLists = priceLists.filter((p) => p.isActive);
          const defaultPriceListId =
            activePriceLists.find((p) => p.isDefault)?.id ?? activePriceLists[0]?.id ?? null;
          if (!defaultPriceListId) {
            setVariantPrepError("No hay lista de precios activa.");
            return null;
          }
          const defaultIva = catalogDefaultIvaTaxIds(taxes);
          const row = createVariantPriceRow(defaultIva, defaultPriceListId);
          const derived = deriveBasePriceFromPriceRows([row]);
          if (derived === null || !row.priceListId?.trim()) {
            setVariantPrepError("No se pudo preparar precios para la variante inicial.");
            return null;
          }
          basePrice = derived;
          priceListItems = [
            {
              priceListId: row.priceListId.trim(),
              netPrice: roundMoneyInt(row.net),
              grossPrice: roundMoneyInt(row.gross),
              taxIds: row.taxIds.length > 0 ? row.taxIds : undefined,
            },
          ];
        }
        const sku = buildInitialSku(productName, productId);
        const isService = type === "SERVICE";
        const r = await createProductVariantAction({
          productId,
          sku,
          barcode: null,
          basePrice,
          unitId: defaultUnit.id,
          isActive: true,
          visibleInEShop: sellable ? visibleInEShop : false,
          priceListItems,
          trackInventory: !isService,
          allowNegativeStock: false,
          minimumStock: 0,
          maximumStock: 0,
          reorderPoint: 0,
        });
        if (r.success) {
          return r.id;
        }
        setVariantPrepError(r.error);
        return null;
      } catch {
        setVariantPrepError("No se pudo crear la variante inicial.");
        return null;
      }
    },
    [visibleInEShop],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setCreatedProductId(null);
    setVariantPrepLoading(false);
    setVariantPrepError(null);
    setStagedProductFiles([]);
    setMediaStagingKey((k) => k + 1);
    setPostCreateUploadError(null);
    setName("");
    setBrandId(null);
    setDescription("");
    setCategoryId(null);
    setProductType("PHYSICAL");
    setIsActive(true);
    setVisibleInEShop(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const [cats, brands] = await Promise.all([listCategoriesForPage(), listBrandsForPage()]);
      if (cancelled) {
        return;
      }
      setCategoryOptions(cats.map((c) => ({ id: c.id, label: c.name })));
      const activeBrands = brands.filter((b) => b.isActive);
      setBrandOptions(activeBrands.map((b) => ({ id: b.id, label: b.name })));
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleClose = () => {
    setCreatedProductId(null);
    setVariantPrepLoading(false);
    setVariantPrepError(null);
    setStagedProductFiles([]);
    setMediaStagingKey((k) => k + 1);
    setPostCreateUploadError(null);
    setName("");
    setBrandId(null);
    setDescription("");
    setCategoryId(null);
    setProductType("PHYSICAL");
    setIsActive(true);
    setVisibleInEShop(false);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (createdProductId) {
      return;
    }
    setError(null);
    setPostCreateUploadError(null);
    startTransition(() => {
      void (async () => {
        const r = await createProductAction({
          name: name.trim(),
          categoryId: categoryId?.trim() || undefined,
          brandId: brandId?.trim() ? brandId.trim() : null,
          description: description.trim() || undefined,
          productType,
          isActive,
          visibleInEShop:
            eshopModuleOn && catalogProductTypeIsSellable(productType)
              ? visibleInEShop
              : false,
        });
        if (!r.success) {
          setError(r.error);
          return;
        }
        setCreatedProductId(r.id);
        setVariantPrepError(null);
        setVariantPrepLoading(true);

        try {
          if (stagedProductFiles.length > 0) {
            const upErr = await uploadFilesToEntity(stagedProductFiles, "product", r.id, multimediaAuth);
            if (upErr) {
              setPostCreateUploadError(upErr);
            }
          }
          const variantId = await runEnsureFirstVariant(r.id, name.trim(), productType);
          await router.refresh();
          if (variantId) {
            await onSuccess?.();
            handleClose();
          }
        } finally {
          setVariantPrepLoading(false);
        }
      })();
    });
  };

  const canSubmit = !createdProductId && name.trim().length > 0 && !isPending && !variantPrepLoading;
  const formDisabled = isPending || variantPrepLoading || createdProductId != null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear producto"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="product-create-dialog"
      alertArea={
        <>
          {error ? (
            <Alert variant="error" data-test-id="product-create-error">
              {error}
            </Alert>
          ) : null}
          {variantPrepError ? (
            <Alert variant="error" data-test-id="product-create-variant-prep-error">
              {variantPrepError}
            </Alert>
          ) : null}
          {postCreateUploadError ? (
            <Alert variant="warning" data-test-id="product-create-upload-warning">
              No se pudieron subir todos los archivos elegidos: {postCreateUploadError}
            </Alert>
          ) : null}
        </>
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending || variantPrepLoading} data-test-id="product-create-cancel">
            {createdProductId ? "Cerrar" : "Cancelar"}
          </Button>
          {!createdProductId ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={isPending || variantPrepLoading}
              data-test-id="product-create-submit"
            >
              Crear
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="product-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="product-create-name"
        />
        <Select
          label="Tipo"
          name="product-create-type"
          placeholder="Seleccione tipo"
          options={getCatalogProductTypeSelectOptions()}
          value={productType}
          onChange={(id) => setProductType(normalizeCatalogProductType(id == null ? "PHYSICAL" : String(id)))}
          data-test-id="product-create-type"
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
          name="product-create-category"
          placeholder="Sin categoría"
          options={categoryOptions}
          value={categoryId}
          onChange={(id) => setCategoryId(id == null ? null : String(id))}
          allowClear
          data-test-id="product-create-category"
        />
        <Select
          label="Marca"
          name="product-create-brand"
          placeholder="Sin marca"
          options={brandOptions}
          value={brandId}
          onChange={(id) => setBrandId(id == null ? null : String(id))}
          allowClear
          data-test-id="product-create-brand"
        />
        <TextField
          label="Descripción"
          name="product-create-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={3}
          data-test-id="product-create-description"
        />

        <div
          className="rounded-lg border border-border bg-muted/10 p-3"
          data-test-id="product-create-form-multimedia"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Multimedia</p>
          <MultimediaField
            mode="staging"
            layout="collection"
            value={stagedProductFiles}
            onChange={setStagedProductFiles}
            stagingResetKey={mediaStagingKey}
            pickButton="icon"
            accept="image/*,video/*"
            maxFiles={12}
            maxSizeMb={9}
            allowPrimary
            disabled={formDisabled}
            data-test-id="product-create-form-multimedia-field"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="product-create-active"
          />
          {eshopModuleOn && catalogProductTypeIsSellable(productType) ? (
            <Switch
              checked={visibleInEShop}
              onChange={setVisibleInEShop}
              label="Activo en eShop"
              labelPosition="right"
              data-test-id="product-create-eshop"
            />
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
