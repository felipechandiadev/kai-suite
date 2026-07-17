"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Barcode, Check, X } from "lucide-react";
import { Badge, Button, DataGridTable as DataGrid, DeleteDialog, IconButton, Select, Switch, type DataGridColumn, type Option } from "@kai/ui";
import type { ProductGridRow, ProductVariantGridRow, ProductVariantMediaAsset } from "@/features/inventory-products/types/product-grid.types";
import {
  deleteProductAction,
  deleteProductVariantAction,
  patchProductGridFlagsAction,
} from "@/features/inventory-products/actions/product.action";
import { CreateProductDialog } from "./CreateProductDialog";
import { EditProductDialog } from "./EditProductDialog";
import { CreateProductVariantDialog } from "./CreateProductVariantDialog";
import { ProductEShopPreviewDialog } from "./ProductEShopPreviewDialog";
import { MultimediaLightbox } from "@/shared/components/Multimedia";
import type { MultimediaLightboxItem } from "@/shared/components/Multimedia/types";
import {
  getCatalogProductTypeSelectOptions,
  normalizeCatalogProductType,
} from "./catalog-product-type-options";
import { isEShopModuleEnabled } from "@/config/eshop-module.config";
import { printVariantBarcodeLabel } from "@/features/catalog-products/print/variant-barcode-label-print";

type ProductsDataGridProps = {
  rows: ProductGridRow[];
  total: number;
};

function ProductGridFlagSwitch({
  productId,
  field,
  checked,
  "data-test-id": dataTestId,
}: {
  productId: string;
  field: "isActive" | "visibleInEShop";
  checked: boolean;
  "data-test-id"?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(checked);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(checked);
  }, [checked, productId]);

  const onChange = (next: boolean) => {
    const previous = value;
    setValue(next);
    startTransition(() => {
      void patchProductGridFlagsAction({
        id: productId,
        ...(field === "isActive" ? { isActive: next } : { visibleInEShop: next }),
      }).then((result) => {
        if (!result.success) {
          setValue(previous);
          return;
        }
        router.refresh();
      });
    });
  };

  return (
    <div
      className="flex w-full items-center justify-start"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      data-test-id={dataTestId}
    >
      <Switch
        checked={value}
        onChange={onChange}
        disabled={pending}
        density="compact"
        aria-label={field === "isActive" ? "Producto activo" : "Visible en eShop"}
      />
    </div>
  );
}

function ProductTypeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("productType") || "";
  const options: Option[] = useMemo(
    () =>
      getCatalogProductTypeSelectOptions().map((o) => ({
        id: o.id,
        label: o.label,
      })),
    [],
  );

  const apply = (productType: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (productType) {
      next.set("productType", normalizeCatalogProductType(productType));
    } else {
      next.delete("productType");
    }
    next.set("page", "1");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?page=1", { scroll: false });
  };

  return (
    <div className="min-w-[12rem] max-w-xs" data-test-id="products-grid-type-filter">
      <Select
        label="Tipo"
        name="products-type-filter"
        placeholder="Todos"
        options={options}
        value={current || null}
        onChange={(id) => apply(id == null ? null : String(id))}
        allowClear
        density="compact"
        labelLayout="inline"
        alwaysShowLabel
        data-test-id="products-type-filter-select"
      />
    </div>
  );
}

function averageReferencePmp(row: ProductGridRow): number {
  const positives = (row.variants ?? [])
    .map((v) =>
      typeof v.pmp === "number" && Number.isFinite(v.pmp) && v.pmp > 0 ? v.pmp : null,
    )
    .filter((n): n is number => n != null);
  if (positives.length === 0) {
    return 0;
  }
  return Math.round(positives.reduce((a, b) => a + b, 0) / positives.length);
}

function productTypePresentation(pt: string | null | undefined): { label: string; variant: "primary" | "warning" | "info" } {
  const t = (pt ?? "PHYSICAL").toString().toUpperCase();
  if (t === "SERVICE") {
    return { label: "Servicio", variant: "warning" };
  }
  if (t === "DIGITAL") {
    return { label: "Digital", variant: "info" };
  }
  if (t === "MANUFACTURADO") {
    return { label: "Manufacturado", variant: "primary" };
  }
  if (t === "ELABORADO") {
    return { label: "Elaborado", variant: "primary" };
  }
  if (t === "PREPARADO") {
    return { label: "Preparado", variant: "primary" };
  }
  return { label: "Físico", variant: "primary" };
}

function formatVariantAttributeEntries(v: ProductVariantGridRow): Array<{ key: string; value: string }> {
  const raw = v.attributeValues;
  if (!raw || typeof raw !== "object") {
    return [];
  }
  return Object.entries(raw)
    .map(([key, val]) => ({ key, value: val != null ? String(val).trim() : "" }))
    .filter((x) => x.value.length > 0);
}

function formatCatalogMoney(amount: number, currency = "CLP"): string {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: currency || "CLP",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return String(Math.round(amount));
  }
}

function isVideoMediaAsset(asset: ProductVariantMediaAsset): boolean {
  return asset.kind === "video" || asset.mimeType.startsWith("video/");
}

function variantMediaAssets(v: ProductVariantGridRow): ProductVariantMediaAsset[] {
  if (v.mediaAssets?.length) {
    return v.mediaAssets;
  }
  if (v.primaryImageUrl?.trim()) {
    return [
      {
        id: `${v.id}-primary`,
        publicUrl: v.primaryImageUrl.trim(),
        mimeType: "image/*",
        kind: "image",
      },
    ];
  }
  return [];
}

function mediaAssetsToLightboxItems(assets: ProductVariantMediaAsset[]): MultimediaLightboxItem[] {
  return assets.map((asset) => ({
    url: asset.publicUrl,
    mimeType: asset.mimeType,
    kind: asset.kind,
  }));
}

function formatVariantLightboxLabel(v: ProductVariantGridRow): string {
  const displayName = v.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  const attrs = formatVariantAttributeEntries(v).map((entry) => entry.value);
  if (attrs.length > 0) {
    return `${v.sku} · ${attrs.join(" / ")}`;
  }
  return v.sku;
}

function formatMediaLightboxTitleBase(
  productName: string,
  variant?: ProductVariantGridRow | null,
): string {
  const name = productName.trim();
  if (!name) {
    return variant ? formatVariantLightboxLabel(variant) : "";
  }
  if (variant) {
    return `${name} — ${formatVariantLightboxLabel(variant)}`;
  }
  return name;
}

function ExpandMediaThumbnails({
  assets,
  className = "",
  emptyPlaceholder,
  productName,
  variant,
  "data-test-id": dataTestId,
  maxVisible = 6,
}: {
  assets: ProductVariantMediaAsset[];
  className?: string;
  emptyPlaceholder?: ReactNode;
  productName?: string;
  variant?: ProductVariantGridRow | null;
  "data-test-id"?: string;
  maxVisible?: number;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const lightboxItems = useMemo(() => mediaAssetsToLightboxItems(assets), [assets]);
  const lightboxTitleBase = useMemo(() => {
    if (!productName?.trim()) {
      return undefined;
    }
    return formatMediaLightboxTitleBase(productName, variant);
  }, [productName, variant]);

  const openAt = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (lightboxItems.length === 0) {
        return;
      }
      setLightboxIndex(Math.min(Math.max(0, index), lightboxItems.length - 1));
      setLightboxOpen(true);
    },
    [lightboxItems.length],
  );

  if (assets.length === 0) {
    return emptyPlaceholder ?? null;
  }
  const visible = assets.slice(0, maxVisible);
  const overflow = assets.length - visible.length;

  return (
    <>
      <div
        className={`flex min-w-0 max-w-full flex-wrap items-center gap-1 ${className}`.trim()}
        data-test-id={dataTestId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {visible.map((asset, index) => (
          <button
            key={asset.id}
            type="button"
            className="relative h-8 w-12 shrink-0 cursor-pointer overflow-hidden rounded border border-border bg-background transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            title={isVideoMediaAsset(asset) ? "Ver video" : "Ver imagen"}
            aria-label={isVideoMediaAsset(asset) ? "Abrir video en visor" : "Abrir imagen en visor"}
            onClick={(e) => openAt(index, e)}
            data-test-id={dataTestId ? `${dataTestId}-thumb-${index}` : undefined}
          >
            {isVideoMediaAsset(asset) ? (
              <video src={asset.publicUrl} className="h-full w-full bg-background object-cover" muted playsInline />
            ) : (
              <img src={asset.publicUrl} alt="" className="h-full w-full bg-background object-cover" loading="lazy" />
            )}
          </button>
        ))}
        {overflow > 0 ? (
          <button
            type="button"
            className="shrink-0 cursor-pointer rounded px-0.5 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            title={`Ver ${assets.length} archivos`}
            aria-label={`Ver galería completa (${assets.length} archivos)`}
            onClick={(e) => openAt(maxVisible, e)}
            data-test-id={dataTestId ? `${dataTestId}-overflow` : undefined}
          >
            +{overflow}
          </button>
        ) : null}
      </div>
      <MultimediaLightbox
        open={lightboxOpen}
        items={lightboxItems}
        initialIndex={lightboxIndex}
        titleBase={lightboxTitleBase}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

function ProductExpandMediaThumbnails({
  assets,
  productName,
}: {
  assets: ProductVariantMediaAsset[];
  productName: string;
}) {
  return (
    <ExpandMediaThumbnails
      assets={assets}
      productName={productName}
      className="min-w-0 max-w-full shrink"
      data-test-id="products-expand-product-media"
    />
  );
}

function VariantExpandSection({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="min-w-0" data-test-id={testId}>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function VariantFlagBadge({
  label,
  enabled,
  enabledLabel = "Sí",
  disabledLabel = "No",
}: {
  label: string;
  enabled: boolean;
  enabledLabel?: string;
  disabledLabel?: string;
}) {
  return (
    <Badge
      variant={enabled ? "success-outlined" : "secondary-outlined"}
      className="inline-flex max-w-full shrink-0 items-center gap-0.5 text-[10px] font-normal"
      title={`${label}: ${enabled ? enabledLabel : disabledLabel}`}
    >
      <span className="text-muted-foreground">{label}</span>
      {enabled ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <X className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </Badge>
  );
}

function ProductVariantExpandCard({
  v,
  productId,
  productName,
  onOpenVariant,
  onPrintBarcode,
  onDelete,
  printingBarcode,
}: {
  v: ProductVariantGridRow;
  productId: string;
  productName: string;
  onOpenVariant: (variantId: string, productId: string) => void;
  onPrintBarcode?: () => void;
  onDelete?: () => void;
  printingBarcode?: boolean;
}) {
  const attributeEntries = formatVariantAttributeEntries(v);
  const barcode = v.barcode?.trim() ?? "";
  const trackInventory = v.trackInventory === true;
  const priceItems = (v.priceListItems ?? []).filter((p) => p.priceListName.trim().length > 0);

  return (
    <div
      className="flex min-w-0 max-w-full cursor-pointer items-start justify-between gap-2 overflow-hidden rounded-md border border-border bg-muted/15 px-2 py-1.5 transition-colors hover:bg-muted/30"
      data-test-id={`products-expand-variant-row-${v.id}`}
      role="button"
      tabIndex={0}
      aria-label={`Ver variante ${v.sku}`}
      title="Ver ficha de variante"
      onClick={() => onOpenVariant(v.id, productId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenVariant(v.id, productId);
        }
      }}
    >
      <div
        className="grid min-w-0 max-w-full flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-3"
        data-test-id={`products-expand-variant-meta-${v.id}`}
      >
        <VariantExpandSection title="SKU / código" testId={`products-expand-variant-ids-${v.id}`}>
          <div className="flex flex-col gap-0 leading-tight">
            <span className="text-[10px] text-muted-foreground" title={`SKU: ${v.sku}`}>
              SKU: <span className="font-mono font-medium text-foreground">{v.sku}</span>
            </span>
            <span
              className="text-[10px] text-muted-foreground"
              title={barcode ? `Código de barras: ${barcode}` : "Sin código de barras"}
            >
              Código: <span className="font-mono font-medium text-foreground">{barcode || "—"}</span>
            </span>
          </div>
        </VariantExpandSection>

        <VariantExpandSection title="Multimedia" testId={`products-expand-variant-media-${v.id}`}>
          <ExpandMediaThumbnails
            assets={variantMediaAssets(v)}
            productName={productName}
            variant={v}
            emptyPlaceholder={<span className="text-[10px] text-muted-foreground">—</span>}
            data-test-id={`products-expand-variant-media-thumbs-${v.id}`}
          />
        </VariantExpandSection>

        <VariantExpandSection title="Atributos" testId={`products-expand-variant-attrs-${v.id}`}>
          {attributeEntries.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {attributeEntries.map(({ key, value }) => (
                <Badge
                  key={key}
                  variant="primary-outlined"
                  className="max-w-full shrink truncate text-[10px] font-medium"
                  title={value}
                  data-test-id={`products-expand-variant-attr-${v.id}-${key}`}
                >
                  {value}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </VariantExpandSection>

        <VariantExpandSection title="Configuración de stock" testId={`products-expand-variant-stock-${v.id}`}>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <VariantFlagBadge label="Inventario" enabled={trackInventory} />
            <VariantFlagBadge
              label="Stock (-)"
              enabled={v.allowNegativeStock === true}
              enabledLabel="Permitido"
              disabledLabel="No permitido"
            />
          </div>
        </VariantExpandSection>

        <VariantExpandSection title="Precios de venta" testId={`products-expand-variant-prices-${v.id}`}>
          {priceItems.length > 0 || v.isActive === false ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {priceItems.map((p) => {
                const listName = p.priceListName.trim();
                const gross = formatCatalogMoney(p.grossPrice, p.currency);
                const net = formatCatalogMoney(p.netPrice, p.currency);
                return (
                  <Badge
                    key={p.priceListId}
                    variant="secondary-outlined"
                    className="inline-flex max-w-full shrink items-center gap-2 text-[10px] font-normal"
                    title={`Precio de venta «${listName}» — Neto ${net} · Bruto ${gross} (c/ imp.)`}
                  >
                    <span className="min-w-0 truncate text-muted-foreground">«{listName}»</span>
                    <span className="shrink-0 font-medium tabular-nums text-foreground">{gross}</span>
                  </Badge>
                );
              })}
              {v.isActive === false ? (
                <Badge variant="warning-outlined" className="shrink-0 text-[10px] font-normal">
                  Inactiva
                </Badge>
              ) : null}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </VariantExpandSection>
      </div>
      {onPrintBarcode || onDelete ? (
        <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {onPrintBarcode ? (
            <IconButton
              icon="Barcode"
              variant="action"
              size="sm"
              ariaLabel="Imprimir código de barras"
              title={barcode ? "Imprimir código de barras" : "Sin código de barras"}
              disabled={!barcode || printingBarcode}
              onClick={() => onPrintBarcode()}
              data-test-id={`products-expand-variant-print-barcode-${v.id}`}
            />
          ) : null}
          {onDelete ? (
            <IconButton
              icon="Trash2"
              variant="action"
              size="sm"
              ariaLabel="Eliminar variante"
              title="Eliminar variante"
              onClick={() => onDelete()}
              data-test-id={`products-expand-variant-delete-${v.id}`}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProductExpandPanel({
  row,
  onAddVariant,
  onOpenVariant,
  onPrintVariantBarcode,
  onDeleteVariant,
  printingVariantId,
}: {
  row: ProductGridRow;
  onAddVariant: (r: ProductGridRow) => void;
  onOpenVariant: (variantId: string, productId: string) => void;
  onPrintVariantBarcode?: (product: ProductGridRow, variant: ProductVariantGridRow) => void;
  onDeleteVariant?: (product: ProductGridRow, variant: ProductVariantGridRow) => void;
  printingVariantId?: string | null;
}) {
  const hasVariants = Boolean(row.variants?.length);

  return (
    <div className="relative box-border w-full min-w-0 max-w-full overflow-x-hidden" data-test-id="products-expand-panel">
      <div className="mb-3 flex w-full min-w-0 max-w-full flex-wrap items-center gap-2">
        <IconButton
          icon="Plus"
          variant="action"
          size="sm"
          ariaLabel="Agregar variante"
          title="Agregar variante"
          onClick={() => onAddVariant(row)}
          data-test-id="products-expand-add-variant"
        />
        <h3 className="shrink-0 text-sm font-semibold text-foreground">Variantes</h3>
        <ProductExpandMediaThumbnails assets={row.mediaAssets ?? []} productName={row.name} />
      </div>

      {hasVariants ? (
        <div
          className="flex w-full min-w-0 max-w-full flex-col gap-1.5 overflow-x-hidden"
          data-test-id="products-expand-variant-cards"
        >
          {row.variants!.map((v) => (
            <ProductVariantExpandCard
              key={v.id}
              v={v}
              productId={row.id}
              productName={row.name}
              onOpenVariant={onOpenVariant}
              onPrintBarcode={
                onPrintVariantBarcode ? () => onPrintVariantBarcode(row, v) : undefined
              }
              onDelete={onDeleteVariant ? () => onDeleteVariant(row, v) : undefined}
              printingBarcode={printingVariantId === v.id}
            />
          ))}
        </div>
      ) : (
        <div
          className="relative w-full min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/[0.06] via-background to-neutral/25 px-6 py-10"
          data-test-id="products-expand-empty-variants"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/20 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-8 h-36 w-36 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex min-h-[9rem] flex-col items-center justify-center gap-3 text-center">
            <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
              <Barcode className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="text-sm font-semibold text-foreground">Sin variantes</p>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              Este producto aún no tiene variantes (SKU, precios e inventario viven en cada variante). Use el botón{" "}
              <span className="font-medium text-foreground">+</span> junto al título «Variantes» para crear la primera.
              Después podrá definir la <span className="font-medium text-foreground">receta</span> en esa variante
              (producto físico o servicio).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsDataGrid({ rows, total }: ProductsDataGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expandProductId = searchParams.get("expandProduct")?.trim() || null;
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<ProductGridRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ProductGridRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [variantDialog, setVariantDialog] = useState<{
    productId: string;
    productName: string;
    productType?: string | null;
    referencePmp: number;
  } | null>(null);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<{
    product: ProductGridRow;
    variant: ProductVariantGridRow;
  } | null>(null);
  const [deleteVariantError, setDeleteVariantError] = useState<string | null>(null);
  const [isDeleteVariantPending, startDeleteVariantTransition] = useTransition();
  const [printingVariantId, setPrintingVariantId] = useState<string | null>(null);
  const [previewRow, setPreviewRow] = useState<ProductGridRow | null>(null);

  const openVariantDialog = useCallback((r: ProductGridRow) => {
    setVariantDialog({
      productId: r.id,
      productName: r.name,
      productType: r.productType ?? "PHYSICAL",
      referencePmp: averageReferencePmp(r),
    });
  }, []);

  const onOpenVariantPage = useCallback(
    (variantId: string, productId: string) => {
      const vid = variantId?.trim();
      const pid = productId?.trim();
      if (!vid || !pid) {
        return;
      }
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("expandProduct", pid);
      const returnTo = `/catalog/products?${qs.toString()}`;
      router.push(
        `/catalog/products/variants/${encodeURIComponent(vid)}?returnTo=${encodeURIComponent(returnTo)}`,
      );
    },
    [router, searchParams],
  );

  const onEditProduct = useCallback((r: ProductGridRow) => {
    setEditRow(r);
  }, []);

  const onDeleteProduct = useCallback((r: ProductGridRow) => {
    setDeleteError(null);
    setDeleteRow(r);
  }, []);

  const onPreviewProduct = useCallback((r: ProductGridRow) => {
    setPreviewRow(r);
  }, []);

  const eshopModuleOn = isEShopModuleEnabled();

  const columns: DataGridColumn[] = useMemo(() => {
    function ProductActionsCell({ row, column: _column }: { row: any; column: DataGridColumn }) {
      const r = row as ProductGridRow;
      return (
        <div
          className="flex items-center justify-center gap-1"
          data-test-id={`products-row-actions-${r.id}`}
        >
          {eshopModuleOn && r.visibleInEShop === true ? (
            <IconButton
              icon="Globe"
              variant="action"
              size="sm"
              title="Vista previa eShop"
              ariaLabel="Vista previa eShop"
              onClick={() => onPreviewProduct(r)}
              data-test-id={`products-row-eshop-preview-${r.id}`}
            />
          ) : null}
          <IconButton
            icon="Pencil"
            variant="action"
            size="sm"
            title="Editar"
            ariaLabel="Editar producto"
            onClick={() => onEditProduct(r)}
            data-test-id={`products-row-edit-${r.id}`}
          />
          <IconButton
            icon="Trash2"
            variant="action"
            size="sm"
            title="Eliminar"
            ariaLabel="Eliminar producto"
            onClick={() => onDeleteProduct(r)}
            data-test-id={`products-row-delete-${r.id}`}
          />
        </div>
      );
    }

    const cols: DataGridColumn[] = [
      {
        field: "name",
        headerName: "Nombre",
        sortable: true,
        minWidth: 200,
        flex: 1,
        cellOverflow: "wrap",
      },
      {
        field: "productType",
        headerName: "Tipo",
        sortable: true,
        width: 116,
        renderCell: ({ row }) => {
          const r = row as ProductGridRow;
          const p = productTypePresentation(r.productType);
          return (
            <Badge variant={p.variant} className="shrink-0">
              {p.label}
            </Badge>
          );
        },
      },
      {
        field: "categoryName",
        headerName: "Categoría",
        sortable: true,
        width: 160,
        renderCell: ({ row }) => {
          const name = (row as ProductGridRow).categoryName?.trim();
          return <span className="text-foreground">{name ? name : "—"}</span>;
        },
      },
      { field: "brand", headerName: "Marca", sortable: true, width: 160 },
      {
        field: "variantCount",
        headerName: "Variantes",
        sortable: true,
        width: 110,
        align: "right",
      },
      {
        field: "isActive",
        headerName: "Activo",
        width: 88,
        align: "left",
        sortable: true,
        renderCell: ({ row }) => {
          const r = row as ProductGridRow;
          return (
            <ProductGridFlagSwitch
              productId={r.id}
              field="isActive"
              checked={r.isActive !== false}
              data-test-id={`products-row-active-${r.id}`}
            />
          );
        },
      },
    ];
    if (eshopModuleOn) {
      cols.push({
        field: "visibleInEShop",
        headerName: "eShop",
        width: 88,
        align: "left",
        sortable: true,
        renderCell: ({ row }) => {
          const r = row as ProductGridRow;
          return (
            <ProductGridFlagSwitch
              productId={r.id}
              field="visibleInEShop"
              checked={r.visibleInEShop === true}
              data-test-id={`products-row-eshop-${r.id}`}
            />
          );
        },
      });
    }
    cols.push({
      field: "actions",
      headerName: "",
      width: eshopModuleOn ? 128 : 96,
      minWidth: eshopModuleOn ? 128 : 96,
      align: "center",
      sortable: false,
      filterable: false,
      actionComponent: ProductActionsCell,
    });
    return cols;
  }, [eshopModuleOn, onEditProduct, onDeleteProduct, onPreviewProduct]);

  const onDeleteVariantClick = useCallback((product: ProductGridRow, variant: ProductVariantGridRow) => {
    setDeleteVariantError(null);
    setDeleteVariantTarget({ product, variant });
  }, []);

  const onPrintVariantBarcodeClick = useCallback(
    (product: ProductGridRow, variant: ProductVariantGridRow) => {
      const barcode = variant.barcode?.trim() ?? "";
      if (!barcode) return;
      setPrintingVariantId(variant.id);
      void printVariantBarcodeLabel({
        productName: product.name,
        sku: variant.sku?.trim() ?? "",
        barcode,
      }).finally(() => {
        setPrintingVariantId((current) => (current === variant.id ? null : current));
      });
    },
    [],
  );

  const expandableRowContent = useCallback(
    (row: ProductGridRow) => (
      <ProductExpandPanel
        row={row}
        onAddVariant={openVariantDialog}
        onOpenVariant={onOpenVariantPage}
        onPrintVariantBarcode={onPrintVariantBarcodeClick}
        onDeleteVariant={onDeleteVariantClick}
        printingVariantId={printingVariantId}
      />
    ),
    [onDeleteVariantClick, onOpenVariantPage, onPrintVariantBarcodeClick, openVariantDialog, printingVariantId],
  );

  return (
    <>
      <DataGrid
        title="Productos"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        fillViewport
        showExportButton={false}
        pinActionsColumn
        actionsColumnField="actions"
        expandable
        expandableRowContent={(row) => expandableRowContent(row as ProductGridRow)}
        defaultExpandedRowIds={expandProductId ? [expandProductId] : []}
        headerActions={<ProductTypeFilter />}
        onAddClick={() => setCreateOpen(true)}
        data-test-id="products-data-grid"
      />
      <CreateProductDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <EditProductDialog
        open={editRow != null}
        product={editRow}
        onClose={() => setEditRow(null)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <ProductEShopPreviewDialog
        open={previewRow != null}
        product={previewRow}
        onClose={() => setPreviewRow(null)}
      />
      <DeleteDialog
        open={deleteRow != null}
        onClose={() => {
          if (!isDeletePending) {
            setDeleteRow(null);
            setDeleteError(null);
          }
        }}
        title="Eliminar producto"
        message={
          deleteRow ? (
            <>
              ¿Eliminar el producto <strong className="font-semibold">«{deleteRow.name}»</strong>? Esta acción no se puede
              deshacer.
            </>
          ) : null
        }
        errors={deleteError ? [deleteError] : []}
        isSubmitting={isDeletePending}
        onConfirm={() => {
          if (!deleteRow) {
            return;
          }
          setDeleteError(null);
          startDeleteTransition(() => {
            void (async () => {
              const r = await deleteProductAction(deleteRow.id);
              if (r.success) {
                setDeleteRow(null);
                await router.refresh();
              } else {
                setDeleteError(r.error);
              }
            })();
          });
        }}
        data-test-id="product-delete-dialog"
      />
      <DeleteDialog
        open={deleteVariantTarget != null}
        onClose={() => {
          if (!isDeleteVariantPending) {
            setDeleteVariantTarget(null);
            setDeleteVariantError(null);
          }
        }}
        title="Eliminar variante"
        message={
          deleteVariantTarget ? (
            <>
              ¿Eliminar la variante <strong className="font-semibold">«{deleteVariantTarget.variant.sku}»</strong> del
              producto <strong className="font-semibold">«{deleteVariantTarget.product.name}»</strong>? Esta acción no se
              puede deshacer.
            </>
          ) : null
        }
        errors={deleteVariantError ? [deleteVariantError] : []}
        isSubmitting={isDeleteVariantPending}
        onConfirm={() => {
          if (!deleteVariantTarget) {
            return;
          }
          setDeleteVariantError(null);
          startDeleteVariantTransition(() => {
            void (async () => {
              const id = deleteVariantTarget.variant.id;
              const r = await deleteProductVariantAction(id);
              if (r.success) {
                setDeleteVariantTarget(null);
                await router.refresh();
              } else {
                setDeleteVariantError(r.error);
              }
            })();
          });
        }}
        data-test-id="product-variant-delete-dialog"
      />
      <CreateProductVariantDialog
        open={variantDialog != null}
        onClose={() => setVariantDialog(null)}
        productId={variantDialog?.productId ?? ""}
        productName={variantDialog?.productName ?? ""}
        productType={(variantDialog as any)?.productType ?? "PHYSICAL"}
        referencePmp={variantDialog?.referencePmp ?? 0}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
