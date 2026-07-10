"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/shared/components/Alert/Alert";
import Badge from "@/shared/components/Badge/Badge";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select, type Option } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch/Switch";
import {
  StockThresholdField,
  formatThresholdReadOnly,
} from "@/shared/components/StockThresholdField/StockThresholdField";
import IconButton from "@/shared/components/IconButton/IconButton";
import {
  updateProductVariantIdentityPartialAction,
  updateProductVariantInventoryPartialAction,
  updateProductVariantLogisticsAction,
  updateProductVariantPricingPartialAction,
} from "@/features/inventory-products/actions/product.action";
import {
  fetchVariantStockBreakdownAction,
  saveVariantStorageThresholdsAction,
} from "@/features/inventory-stock/actions/stock.action";
import {
  storageDraftsFromBreakdown,
  storageThresholdsPayloadFromDrafts,
  type StorageThresholdDraft,
} from "@/features/inventory-stock/lib/variant-stock-threshold-config";
import { VariantDetailStorageThresholdsBlock } from "./VariantDetailStorageThresholdsBlock";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import { dimensionLabel } from "@/features/inventory-units/types/unit.types";
import { fetchUnitsForPage } from "@/features/inventory-units/lib/fetch-units-for-page";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { fetchPriceListsForPage } from "@/features/sales-price-lists/lib/fetch-price-lists-for-page";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { fetchTaxesForPage } from "@/features/accounting-taxes/lib/fetch-taxes-for-page";
import { fetchAttributesForPage } from "@/features/inventory-attributes/lib/fetch-attributes-for-page";
import type { AttributeListItem } from "@/features/inventory-attributes/types/attribute.types";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import {
  catalogDefaultIvaTaxIds,
  filterSelectableSaleTaxes,
  resolveVariantTaxIds,
} from "@/features/inventory-products/lib/sale-taxes";
import {
  deriveBasePriceFromPriceRows,
  netToGross,
  resolvePricingGrossFactor,
  roundMoneyInt,
} from "@/features/inventory-products/domain/price-tax-math";
import {
  forcesNetEqualsGross,
  normalizeVariantTaxCategory,
} from "@/features/inventory-products/types/variant-fiscal.types";
import {
  priceListItemsToVariantRows,
  VariantPriceRowsEditor,
  type VariantPriceRowModel,
} from "../../../ui/VariantPriceRowsEditor";
import { VariantPmpPriceCalculatorDialog } from "../../../ui/VariantPmpPriceCalculatorDialog";
import { VariantJewelryPriceCalculatorDialog } from "../../../ui/VariantJewelryPriceCalculatorDialog";
import { VariantWeightFields } from "../../../ui/VariantWeightFields";
import {
  displayWeightToNetWeightKg,
  netWeightKgToDisplay,
  weightInGrams,
  type VariantWeightUnit,
} from "@/features/inventory-products/lib/variant-weight";
import {
  fetchVariantSalePriceHistoryForPage,
  invalidateVariantSalePriceHistoryCache,
  lastUpdatedByListIdFromHistory,
} from "@/features/inventory-products/lib/variant-sale-price-history";
import type { VariantSalePriceHistoryEntry } from "@/features/inventory-products/types/variant-sale-price-history.types";
import { VariantSalePriceHistoryPanel } from "./VariantSalePriceHistoryPanel";

type SectionProps = {
  productId: string;
  productType: string | null;
  variant: ProductVariantGridRow;
  /** Solo lectura: categoría del producto padre. */
  productCategoryName?: string | null;
  /** Solo lectura: marca del producto padre (texto o catálogo). */
  productBrand?: string | null;
};

function noop() {}

type VariantAttrEditRow = { key: string; attributeId: string | null; value: string | null };

function variantAttributeValueBadges(v: ProductVariantGridRow): Array<{ key: string; value: string }> {
  const raw = v.attributeValues;
  if (!raw || typeof raw !== "object") {
    return [];
  }
  return Object.entries(raw)
    .map(([key, val]) => ({ key, value: val != null ? String(val).trim() : "" }))
    .filter((x) => x.value.length > 0);
}

function sectionCardClass(editing: boolean): string {
  return `relative space-y-3 rounded-lg border border-border bg-background p-4 pb-12 ${
    editing ? "ring-1 ring-primary/25" : ""
  }`;
}

export function VariantDetailIdentitySection({
  productId,
  variant,
  productCategoryName,
  productBrand,
}: SectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [units, setUnits] = useState<UnitListItem[]>([]);
  const [attributes, setAttributes] = useState<AttributeListItem[]>([]);
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [stockBaseUnitId, setStockBaseUnitId] = useState<string | null>(null);
  const [purchaseUnitId, setPurchaseUnitId] = useState<string | null>(null);
  const [stockBaseQtyPerCountSaleUnit, setStockBaseQtyPerCountSaleUnit] = useState("");
  const [stockBaseQtyPerCountPurchaseUnit, setStockBaseQtyPerCountPurchaseUnit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [attrEditRows, setAttrEditRows] = useState<VariantAttrEditRow[]>([]);

  const selectableAttributes = useMemo(() => {
    return [...attributes]
      .filter((a) => a.isActive && Array.isArray(a.options) && a.options.length > 0)
      .sort((a, b) => {
        const o = a.displayOrder - b.displayOrder;
        if (o !== 0) {
          return o;
        }
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      });
  }, [attributes]);

  const unitOptions: Option[] = useMemo(() => {
    return [...units]
      .filter((u) => u.active)
      .sort((a, b) =>
        `${a.name} ${a.symbol}`.localeCompare(`${b.name} ${b.symbol}`, "es", { sensitivity: "base" }),
      )
      .map((u) => ({
        id: u.id,
        label: `${u.name}${u.symbol ? ` (${u.symbol})` : ""}`,
      }));
  }, [units]);

  const stockUnitMeta = useMemo(
    () => units.find((u) => u.id === stockBaseUnitId),
    [units, stockBaseUnitId],
  );
  const saleUnitMeta = useMemo(() => units.find((u) => u.id === unitId), [units, unitId]);
  const purchaseUnitMeta = useMemo(
    () => units.find((u) => u.id === purchaseUnitId),
    [units, purchaseUnitId],
  );

  const needsCountSaleBridge = useMemo(() => {
    if (!stockUnitMeta || !saleUnitMeta) {
      return false;
    }
    return stockUnitMeta.dimension !== "count" && saleUnitMeta.dimension === "count";
  }, [stockUnitMeta, saleUnitMeta]);

  const needsCountPurchaseBridge = useMemo(() => {
    if (!stockUnitMeta || !purchaseUnitMeta) {
      return false;
    }
    return stockUnitMeta.dimension !== "count" && purchaseUnitMeta.dimension === "count";
  }, [stockUnitMeta, purchaseUnitMeta]);

  useEffect(() => {
    void (async () => {
      try {
        const [list, attrs] = await Promise.all([fetchUnitsForPage(), fetchAttributesForPage()]);
        setUnits(list);
        setAttributes(attrs);
        if (list.length === 0) {
          setLoadError("No hay unidades de medida. Cree una en Inventario → Unidades.");
        } else if (!list.some((u) => u.active)) {
          setLoadError("No hay unidades de medida activas.");
        } else {
          setLoadError(null);
        }
      } catch {
        setLoadError("No se pudieron cargar unidades o atributos.");
      }
    })();
  }, []);

  const hydrateFromVariant = useCallback((v: ProductVariantGridRow, _attrs: AttributeListItem[]) => {
    setSku(v.sku ?? "");
    setBarcode(v.barcode?.trim() ?? "");
    const saleId =
      (v as { saleUnitId?: string }).saleUnitId?.trim() || v.unitId?.trim() || null;
    setUnitId(saleId);
    setStockBaseUnitId(v.stockBaseUnitId?.trim() ? v.stockBaseUnitId.trim() : saleId);
    setPurchaseUnitId(v.purchaseUnitId?.trim() ? v.purchaseUnitId.trim() : saleId);
    setStockBaseQtyPerCountSaleUnit(
      v.stockBaseQtyPerCountSaleUnit != null && Number.isFinite(Number(v.stockBaseQtyPerCountSaleUnit))
        ? String(v.stockBaseQtyPerCountSaleUnit)
        : "",
    );
    setStockBaseQtyPerCountPurchaseUnit(
      v.stockBaseQtyPerCountPurchaseUnit != null && Number.isFinite(Number(v.stockBaseQtyPerCountPurchaseUnit))
        ? String(v.stockBaseQtyPerCountPurchaseUnit)
        : "",
    );
    setIsActive(v.isActive !== false);
  }, []);

  useEffect(() => {
    if (editing) {
      return;
    }
    hydrateFromVariant(variant, attributes);
  }, [variant, attributes, editing, hydrateFromVariant]);

  const saleLabel =
    variant.saleUnitLabel?.trim() ||
    variant.unitOfMeasure?.trim() ||
    (variant.unitId ? `ID ${variant.unitId.slice(0, 8)}…` : "—");
  const stockLabel =
    variant.stockBaseUnitLabel?.trim() ||
    (variant.stockBaseUnitId ? `ID ${variant.stockBaseUnitId.slice(0, 8)}…` : "—");
  const purchaseLabel =
    variant.purchaseUnitLabel?.trim() ||
    (variant.purchaseUnitId ? `ID ${variant.purchaseUnitId.slice(0, 8)}…` : "—");

  const toggleEditOrSave = () => {
    setError(null);
    if (!editing) {
      hydrateFromVariant(variant, attributes);
      const av = variant.attributeValues ?? {};
      const nextRows: VariantAttrEditRow[] = [];
      for (const a of selectableAttributes) {
        const raw = av[a.id];
        const val = raw != null && String(raw).trim() !== "" ? String(raw).trim() : null;
        if (val) {
          nextRows.push({ key: a.id, attributeId: a.id, value: val });
        }
      }
      setAttrEditRows(nextRows);
      setEditing(true);
      return;
    }

    const pid = productId?.trim() ?? "";
    const vid = variant.id?.trim() ?? "";
    if (!pid || !vid) {
      setError("Datos no válidos");
      return;
    }
    if (!sku.trim()) {
      setError("El SKU es obligatorio");
      return;
    }
    if (!unitId || !stockBaseUnitId || !purchaseUnitId) {
      setError("Seleccione unidad de venta, stock y compra");
      return;
    }

    let stockBaseQtyPerCountSaleUnitOut: number | undefined;
    let stockBaseQtyPerCountPurchaseUnitOut: number | undefined;
    if (needsCountSaleBridge) {
      const n = Number(String(stockBaseQtyPerCountSaleUnit).replace(",", ".").trim());
      if (!Number.isFinite(n) || n <= 0) {
        setError(
          `Indique cuánto stock (${dimensionLabel(stockUnitMeta!.dimension)} en ${stockUnitMeta!.symbol || stockUnitMeta!.name}) equivale 1 unidad de venta.`,
        );
        return;
      }
      stockBaseQtyPerCountSaleUnitOut = n;
    }
    if (needsCountPurchaseBridge) {
      const n = Number(String(stockBaseQtyPerCountPurchaseUnit).replace(",", ".").trim());
      if (!Number.isFinite(n) || n <= 0) {
        setError(
          `Indique cuánto stock (${dimensionLabel(stockUnitMeta!.dimension)} en ${stockUnitMeta!.symbol || stockUnitMeta!.name}) equivale 1 unidad de compra.`,
        );
        return;
      }
      stockBaseQtyPerCountPurchaseUnitOut = n;
    }

    const attributeValues: Record<string, string> = {};
    const seenAttrIds = new Set<string>();
    for (const row of attrEditRows) {
      const aid = row.attributeId?.trim() ?? "";
      const rawVal = row.value?.trim() ?? "";
      if (!aid && !rawVal) {
        continue;
      }
      if (!aid || !rawVal) {
        setError("Complete atributo y valor en cada fila, o elimine la fila vacía.");
        return;
      }
      if (seenAttrIds.has(aid)) {
        setError("No repita el mismo atributo en más de una fila.");
        return;
      }
      seenAttrIds.add(aid);
      const def = selectableAttributes.find((a) => a.id === aid);
      if (!def) {
        setError("Atributo no válido.");
        return;
      }
      if (!def.options.includes(rawVal)) {
        setError(`El valor seleccionado no es válido para «${def.name}».`);
        return;
      }
      attributeValues[aid] = rawVal;
    }
    const attributeValuesPayload =
      Object.keys(attributeValues).length > 0 ? attributeValues : undefined;

    startTransition(() => {
      void (async () => {
        const r = await updateProductVariantIdentityPartialAction(vid, {
          productId: pid,
          sku: sku.trim(),
          barcode: barcode.trim() || null,
          unitId: String(unitId),
          stockBaseUnitId: String(stockBaseUnitId),
          purchaseUnitId: String(purchaseUnitId),
          isActive,
          stockBaseQtyPerCountSaleUnit: stockBaseQtyPerCountSaleUnitOut,
          stockBaseQtyPerCountPurchaseUnit: stockBaseQtyPerCountPurchaseUnitOut,
          attributeValues: attributeValuesPayload,
        });
        if (r.success) {
          setEditing(false);
          await router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const ro = !editing;

  const valueBadgeEntries = useMemo(() => variantAttributeValueBadges(variant), [variant]);

  const attributeOptionsForRow = (rowKey: string): Option[] => {
    return selectableAttributes
      .filter(
        (a) =>
          attrEditRows.some((r) => r.key === rowKey && r.attributeId === a.id) ||
          !attrEditRows.some((r) => r.key !== rowKey && r.attributeId === a.id),
      )
      .map((a) => ({ id: a.id, label: a.name }));
  };

  const valueOptionsForAttributeId = (attributeId: string | null): Option[] => {
    if (!attributeId) {
      return [];
    }
    const def = selectableAttributes.find((a) => a.id === attributeId);
    if (!def?.options?.length) {
      return [];
    }
    return def.options.map((opt) => ({ id: opt, label: opt }));
  };

  return (
    <section className={sectionCardClass(editing)} data-test-id="pv-section-identity">
      <h2 className="text-sm font-semibold text-foreground">Identidad y atributos</h2>
      {loadError ? (
        <Alert variant="error" data-test-id="pv-section-identity-load">
          {loadError}
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="error" data-test-id="pv-section-identity-error">
          {error}
        </Alert>
      ) : null}

      <div className="rounded-lg border border-dashed border-border bg-muted/15 p-3" data-test-id="pv-id-product-meta">
        <p className="text-xs font-medium text-foreground">Datos del producto</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Categoría y marca pertenecen al producto; edítelas en la ficha del producto.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField
            label="Categoría"
            name="pv-id-product-category"
            value={productCategoryName?.trim() ? productCategoryName.trim() : "—"}
            readOnly
            onChange={noop}
            data-test-id="pv-id-product-category"
          />
          <TextField
            label="Marca"
            name="pv-id-product-brand"
            value={productBrand?.trim() ? productBrand.trim() : "—"}
            readOnly
            onChange={noop}
            data-test-id="pv-id-product-brand"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="SKU"
          name="pv-id-sku"
          value={sku}
          onChange={ro ? noop : (e) => setSku(e.target.value)}
          readOnly={ro}
          required
          data-test-id="pv-id-sku"
        />
        <TextField
          label="Código de barras"
          name="pv-id-barcode"
          value={barcode}
          onChange={ro ? noop : (e) => setBarcode(e.target.value)}
          readOnly={ro}
          placeholder="Opcional"
          data-test-id="pv-id-barcode"
        />
      </div>

      {editing ? (
        <div className="flex min-w-0 flex-col gap-3 border-t border-border pt-3">
          <Select
            label="Unidad de venta"
            name="pv-id-unit-sale"
            options={unitOptions}
            value={unitId}
            onChange={(v) => setUnitId(v != null ? String(v) : null)}
            placeholder="Unidad"
            required
            disabled={unitOptions.length === 0}
            data-test-id="pv-id-unit-sale"
          />
          <Select
            label="Unidad de stock (inventario)"
            name="pv-id-unit-stock"
            options={unitOptions}
            value={stockBaseUnitId}
            onChange={(v) => setStockBaseUnitId(v != null ? String(v) : null)}
            placeholder="Unidad base"
            required
            disabled={unitOptions.length === 0}
            data-test-id="pv-id-unit-stock"
          />
          <Select
            label="Unidad de compra"
            name="pv-id-unit-purchase"
            options={unitOptions}
            value={purchaseUnitId}
            onChange={(v) => setPurchaseUnitId(v != null ? String(v) : null)}
            placeholder="Unidad OC"
            required
            disabled={unitOptions.length === 0}
            data-test-id="pv-id-unit-purchase"
          />
          <p className="text-xs text-muted-foreground">
            Si el stock es masa, volumen o longitud y la venta o compra son de conteo, indique el equivalente por 1
            unidad de venta o de compra.
          </p>
          {needsCountSaleBridge ? (
            <TextField
              label={`Por 1 unidad de venta (${stockUnitMeta?.symbol || stockUnitMeta?.name || "stock"})`}
              name="pv-id-bridge-sale"
              value={stockBaseQtyPerCountSaleUnit}
              onChange={(e) => setStockBaseQtyPerCountSaleUnit(e.target.value)}
              placeholder="Ej: 250"
            />
          ) : null}
          {needsCountPurchaseBridge ? (
            <TextField
              label={`Por 1 unidad de compra (${stockUnitMeta?.symbol || stockUnitMeta?.name || "stock"})`}
              name="pv-id-bridge-purchase"
              value={stockBaseQtyPerCountPurchaseUnit}
              onChange={(e) => setStockBaseQtyPerCountPurchaseUnit(e.target.value)}
              placeholder="Ej: 250"
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Unidad de venta" name="pv-id-sale" value={saleLabel} onChange={noop} readOnly />
          <TextField label="Unidad base (inventario)" name="pv-id-stock" value={stockLabel} onChange={noop} readOnly />
          <TextField label="Unidad de compra" name="pv-id-purchase" value={purchaseLabel} onChange={noop} readOnly />
        </div>
      )}

      {!editing &&
      (variant.stockBaseQtyPerCountSaleUnit != null ||
        variant.stockBaseQtyPerCountPurchaseUnit != null) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {variant.stockBaseQtyPerCountSaleUnit != null ? (
            <TextField
              label="Stock base por 1 u. venta (conteo)"
              name="pv-id-bridge-sale-ro"
              value={String(variant.stockBaseQtyPerCountSaleUnit)}
              onChange={noop}
              readOnly
            />
          ) : null}
          {variant.stockBaseQtyPerCountPurchaseUnit != null ? (
            <TextField
              label="Stock base por 1 u. compra (conteo)"
              name="pv-id-bridge-purchase-ro"
              value={String(variant.stockBaseQtyPerCountPurchaseUnit)}
              onChange={noop}
              readOnly
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <Switch
          checked={isActive}
          onChange={setIsActive}
          label="Variante activa"
          labelPosition="right"
          disabled={ro}
          data-test-id="pv-id-active"
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/15 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Atributos</p>
          {editing && selectableAttributes.length > 0 ? (
            <IconButton
              icon="Plus"
              variant="action"
              size="sm"
              ariaLabel="Agregar atributo"
              title="Agregar atributo"
              onClick={() =>
                setAttrEditRows((prev) => [
                  ...prev,
                  { key: `new-${crypto.randomUUID()}`, attributeId: null, value: null },
                ])
              }
              data-test-id="pv-id-attr-add-row"
            />
          ) : null}
        </div>

        {!editing ? (
          valueBadgeEntries.length > 0 ? (
            <div className="mt-2 flex min-w-0 flex-wrap gap-1" data-test-id="pv-id-attr-badges">
              {valueBadgeEntries.map(({ key, value }) => (
                <Badge key={key} variant="secondary-outlined" className="max-w-full truncate text-xs font-normal">
                  {value}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Sin valores de atributo.</p>
          )
        ) : selectableAttributes.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No hay atributos configurados en el catálogo.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {attrEditRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">Pulse + para agregar un atributo y su valor.</p>
            ) : null}
            {attrEditRows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-2 sm:flex-row sm:items-end"
                data-test-id={`pv-id-attr-row-${row.key}`}
              >
                <div className="min-w-0 flex-1">
                  <Select
                    label="Atributo"
                    name={`pv-id-attr-${row.key}`}
                    density="compact"
                    options={attributeOptionsForRow(row.key)}
                    value={row.attributeId}
                    onChange={(id) => {
                      const nextId = id != null ? String(id) : null;
                      setAttrEditRows((prev) =>
                        prev.map((r) =>
                          r.key === row.key ? { ...r, attributeId: nextId, value: null } : r,
                        ),
                      );
                    }}
                    placeholder="Seleccione"
                    data-test-id={`pv-id-attr-select-${row.key}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Select
                    label="Valor"
                    name={`pv-id-attr-val-${row.key}`}
                    density="compact"
                    options={valueOptionsForAttributeId(row.attributeId)}
                    value={row.value}
                    onChange={(id) => {
                      const nextVal = id != null ? String(id) : null;
                      setAttrEditRows((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, value: nextVal } : r)),
                      );
                    }}
                    placeholder={row.attributeId ? "Seleccione" : "—"}
                    disabled={!row.attributeId}
                    data-test-id={`pv-id-attr-val-select-${row.key}`}
                  />
                </div>
                <div className="flex shrink-0 justify-end pb-0.5 sm:pb-1">
                  <IconButton
                    icon="Trash2"
                    variant="action"
                    size="sm"
                    ariaLabel="Quitar fila"
                    title="Quitar fila"
                    onClick={() => setAttrEditRows((prev) => prev.filter((r) => r.key !== row.key))}
                    data-test-id={`pv-id-attr-row-del-${row.key}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-2 right-2">
        <IconButton
          icon={editing ? "Save" : "Pencil"}
          variant="action"
          size="sm"
          ariaLabel={editing ? "Guardar identidad" : "Editar identidad"}
          onClick={toggleEditOrSave}
          disabled={pending || Boolean(loadError)}
          isLoading={pending}
          data-test-id="pv-section-identity-edit-save"
        />
      </div>

    </section>
  );
}

function formatPriceListUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso?.trim()) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

export function VariantDetailPricingSection({ productId, variant }: SectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [priceLists, setPriceLists] = useState<PriceListListItem[]>([]);
  const [taxes, setTaxes] = useState<TaxListItem[]>([]);
  const [priceRows, setPriceRows] = useState<VariantPriceRowModel[]>([]);
  const [pmpCalculatorRowKey, setPmpCalculatorRowKey] = useState<string | null>(null);
  const [jewelryCalculatorRowKey, setJewelryCalculatorRowKey] = useState<string | null>(null);
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState<VariantWeightUnit>("g");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [historyItems, setHistoryItems] = useState<VariantSalePriceHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const referenceDataLoadIdRef = useRef(0);
  const historyLoadIdRef = useRef(0);

  const lastUpdatedByListId = useMemo(
    () => lastUpdatedByListIdFromHistory(historyItems),
    [historyItems],
  );

  const catalogTaxes = useMemo(() => filterSelectableSaleTaxes(taxes), [taxes]);
  const defaultIvaTaxIds = useMemo(() => catalogDefaultIvaTaxIds(taxes), [taxes]);
  const taxCategory = useMemo(
    () => normalizeVariantTaxCategory(variant.taxCategory),
    [variant.taxCategory],
  );
  const netEqualsGross = forcesNetEqualsGross(taxCategory);
  const masterTaxIds = useMemo(
    () => resolveVariantTaxIds(variant, undefined, defaultIvaTaxIds),
    [variant, defaultIvaTaxIds],
  );

  useEffect(() => {
    const loadId = ++referenceDataLoadIdRef.current;
    void (async () => {
      try {
        const [pls, txs] = await Promise.all([fetchPriceListsForPage(), fetchTaxesForPage()]);
        if (loadId !== referenceDataLoadIdRef.current) {
          return;
        }
        setPriceLists(pls);
        setTaxes(txs);
        if (!pls.some((p) => p.isActive)) {
          setLoadError("No hay listas de precios activas.");
        } else {
          setLoadError(null);
        }
      } catch {
        if (loadId !== referenceDataLoadIdRef.current) {
          return;
        }
        setLoadError("No se pudieron cargar listas de precios o impuestos.");
      }
    })();
  }, []);

  useEffect(() => {
    if (editing) {
      return;
    }
    const defaultIva = catalogDefaultIvaTaxIds(taxes);
    const master = resolveVariantTaxIds(variant, undefined, defaultIva);
    setPriceRows(priceListItemsToVariantRows(variant.priceListItems ?? [], master));
  }, [variant, taxes, editing]);

  useEffect(() => {
    if (editing) {
      return;
    }
    const vid = variant.id?.trim() ?? "";
    if (!vid) {
      setHistoryItems([]);
      setHistoryLoading(false);
      setHistoryError(null);
      return;
    }
    const loadId = ++historyLoadIdRef.current;
    setHistoryLoading(true);
    setHistoryError(null);
    void (async () => {
      const r = await fetchVariantSalePriceHistoryForPage(vid, { limit: 50 });
      if (loadId !== historyLoadIdRef.current) {
        return;
      }
      setHistoryLoading(false);
      if (r.success) {
        setHistoryItems(r.items);
      } else {
        setHistoryError(r.error);
        setHistoryItems([]);
      }
    })();
  }, [variant.id, editing, historyRefreshKey]);

  const formatMoney = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("es-CL", { style: "currency", currency: currency || "CLP" }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  const toggleEditOrSave = () => {
    setError(null);
    if (!editing) {
      const defaultIva = catalogDefaultIvaTaxIds(taxes);
      const master = resolveVariantTaxIds(variant, undefined, defaultIva);
      setPriceRows(priceListItemsToVariantRows(variant.priceListItems ?? [], master));
      const w = netWeightKgToDisplay(
        variant.netWeightKg != null && Number.isFinite(Number(variant.netWeightKg))
          ? Number(variant.netWeightKg)
          : null,
      );
      setWeightValue(w.value);
      setWeightUnit(w.unit);
      setEditing(true);
      return;
    }

    const pid = productId?.trim() ?? "";
    const vid = variant.id?.trim() ?? "";
    if (!pid || !vid) {
      setError("Datos no válidos");
      return;
    }
    if (priceRows.some((r) => !r.priceListId?.trim())) {
      setError("Seleccione una lista de precios en cada fila.");
      return;
    }
    const filteredRows = priceRows.filter((r) => r.priceListId?.trim());
    if (filteredRows.length === 0) {
      setError("Agregue al menos un precio vinculado a una lista de precios.");
      return;
    }
    const dup = new Set<string>();
    for (const r of filteredRows) {
      const lid = r.priceListId!.trim();
      if (dup.has(lid)) {
        setError("No puede repetir la misma lista de precios en más de una fila.");
        return;
      }
      dup.add(lid);
    }
    const basePrice = deriveBasePriceFromPriceRows(filteredRows);
    if (basePrice === null) {
      setError("No se pudo determinar el precio de referencia.");
      return;
    }
    if (netEqualsGross) {
      const mismatch = filteredRows.some((r) => roundMoneyInt(r.net) !== roundMoneyInt(r.gross));
      if (mismatch) {
        setError("Para este tratamiento SII el precio neto debe ser igual al precio con impuestos.");
        return;
      }
    }
    const priceListItems = filteredRows.map((r) => {
      const netPrice = roundMoneyInt(r.net);
      const grossPrice = netEqualsGross ? netPrice : roundMoneyInt(r.gross);
      return {
        priceListId: r.priceListId!.trim(),
        netPrice,
        grossPrice,
        taxIds: netEqualsGross ? undefined : masterTaxIds.length > 0 ? [...masterTaxIds] : undefined,
      };
    });

    startTransition(() => {
      void (async () => {
        const netWeightKg = displayWeightToNetWeightKg(weightValue, weightUnit);
        const r = await updateProductVariantPricingPartialAction(vid, {
          productId: pid,
          basePrice,
          priceListItems,
        });
        if (!r.success) {
          setError(r.error);
          return;
        }
        if (netWeightKg != null) {
          const lr = await updateProductVariantLogisticsAction(vid, {
            netWeightKg,
            grossWeightKg:
              variant.grossWeightKg != null && Number.isFinite(Number(variant.grossWeightKg))
                ? Number(variant.grossWeightKg)
                : null,
            packageLengthCm:
              variant.packageLengthCm != null && Number.isFinite(Number(variant.packageLengthCm))
                ? Number(variant.packageLengthCm)
                : null,
            packageWidthCm:
              variant.packageWidthCm != null && Number.isFinite(Number(variant.packageWidthCm))
                ? Number(variant.packageWidthCm)
                : null,
            packageHeightCm:
              variant.packageHeightCm != null && Number.isFinite(Number(variant.packageHeightCm))
                ? Number(variant.packageHeightCm)
                : null,
            volumetricDivisorK:
              variant.volumetricDivisorK != null && Number.isFinite(Number(variant.volumetricDivisorK))
                ? Math.round(Number(variant.volumetricDivisorK))
                : null,
          });
          if (!lr.success) {
            setError(lr.error);
            return;
          }
        }
        setEditing(false);
        invalidateVariantSalePriceHistoryCache(vid, { limit: 50 });
        setHistoryRefreshKey((k) => k + 1);
        await router.refresh();
      })();
    });
  };

  const handlePmpCalculatorApply = (_pmp: number, net: number, priceRowKey: string) => {
    setPriceRows((prev) =>
      prev.map((r) => {
        if (r.key !== priceRowKey) {
          return r;
        }
        const f = resolvePricingGrossFactor(taxCategory, catalogTaxes, masterTaxIds);
        const n = roundMoneyInt(net);
        const g = netEqualsGross ? n : netToGross(n, f);
        return { ...r, net: n, gross: g, lastEdited: "net" as const };
      }),
    );
  };

  const handleJewelryCalculatorApply = (net: number, priceRowKey: string) => {
    handlePmpCalculatorApply(0, net, priceRowKey);
  };

  const syncWeightFromGrams = (grams: number) => {
    if (grams > 0) {
      setWeightValue(String(grams));
      setWeightUnit("g");
    }
  };

  const weightGrams = useMemo(() => {
    if (editing) {
      return weightInGrams(weightValue, weightUnit);
    }
    const d = netWeightKgToDisplay(
      variant.netWeightKg != null && Number.isFinite(Number(variant.netWeightKg))
        ? Number(variant.netWeightKg)
        : null,
    );
    return weightInGrams(d.value, d.unit);
  }, [editing, weightValue, weightUnit, variant.netWeightKg]);

  const ro = !editing;

  return (
    <div className="space-y-4">
    <section className={sectionCardClass(editing)} data-test-id="pv-section-pricing">
      {loadError ? <Alert variant="error">{loadError}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {ro ? (
        <div className="space-y-2 text-sm">
          <TextField
            label="PMP (precio medio ponderado)"
            name="pv-pr-pmp"
            value={
              variant.pmp != null && Number.isFinite(variant.pmp)
                ? formatMoney(variant.pmp, "CLP")
                : "Sin PMP — pendiente primera compra"
            }
            onChange={noop}
            readOnly
          />
          {variant.priceListItems.length === 0 ? (
            <p className="text-muted-foreground">Sin precios por lista.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {variant.priceListItems.map((p) => {
                const updatedAtLabel = formatPriceListUpdatedAt(
                  p.updatedAt ?? lastUpdatedByListId[p.priceListId] ?? null,
                );
                return (
                  <li key={p.priceListId} className="flex flex-col gap-0.5 px-3 py-2">
                    <span className="font-medium">{p.priceListName}</span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className="min-w-0 tabular-nums text-muted-foreground">
                        {netEqualsGross ? (
                          <>
                            Precio de venta {formatMoney(p.netPrice, p.currency)}
                            <span className="text-xs"> (neto = con impuestos)</span>
                          </>
                        ) : (
                          <>
                            Neto {formatMoney(p.netPrice, p.currency)} · Con impuestos{" "}
                            {formatMoney(p.grossPrice, p.currency)}
                          </>
                        )}
                      </span>
                      {updatedAtLabel ? (
                        <span
                          className="shrink-0 text-xs text-muted-foreground"
                          data-test-id={`pv-price-list-updated-${p.priceListId}`}
                        >
                          Última actualización {updatedAtLabel}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3 border-t border-border pt-3">
          <TextField
            label="PMP (precio medio ponderado)"
            name="pv-pr-pmp-edit"
            value={
              variant.pmp != null && Number.isFinite(variant.pmp)
                ? formatMoney(variant.pmp, "CLP")
                : "Sin PMP — se define con la primera compra"
            }
            onChange={noop}
            readOnly
          />
          <VariantWeightFields
            weight={weightValue}
            weightUnit={weightUnit}
            onWeightChange={setWeightValue}
            onWeightUnitChange={setWeightUnit}
            testIdPrefix="pv-pricing-edit-weight"
          />
          <VariantPriceRowsEditor
            priceLists={priceLists}
            catalogTaxes={catalogTaxes}
            taxCategory={taxCategory}
            variantTaxIds={masterTaxIds}
            rows={priceRows}
            onRowsChange={setPriceRows}
            defaultIvaTaxIds={defaultIvaTaxIds}
            onOpenPmpCalculator={(rowKey) => setPmpCalculatorRowKey(rowKey)}
            onOpenJewelryCalculator={(rowKey) => setJewelryCalculatorRowKey(rowKey)}
          />
        </div>
      )}

      <div className="absolute bottom-2 right-2">
        <IconButton
          icon={editing ? "Save" : "Pencil"}
          variant="action"
          size="sm"
          ariaLabel={editing ? "Guardar precios" : "Editar precios"}
          onClick={toggleEditOrSave}
          disabled={pending || Boolean(loadError)}
          isLoading={pending}
          data-test-id="pv-section-pricing-edit-save"
        />
      </div>

      <VariantPmpPriceCalculatorDialog
        open={pmpCalculatorRowKey != null}
        onClose={() => setPmpCalculatorRowKey(null)}
        initialPmp={
          variant.pmp != null && Number.isFinite(variant.pmp) ? Math.max(0, Math.round(variant.pmp)) : 0
        }
        taxCategory={taxCategory}
        priceRowKey={pmpCalculatorRowKey}
        taxIdsForPreview={masterTaxIds}
        catalogTaxes={catalogTaxes}
        onApply={handlePmpCalculatorApply}
      />
      <VariantJewelryPriceCalculatorDialog
        open={jewelryCalculatorRowKey != null}
        onClose={() => setJewelryCalculatorRowKey(null)}
        weightGrams={weightGrams}
        onWeightGramsChange={syncWeightFromGrams}
        priceRowKey={jewelryCalculatorRowKey}
        onApply={handleJewelryCalculatorApply}
      />
    </section>

    {!editing ? (
      <section
        className="space-y-3 rounded-lg border border-border bg-background p-4"
        data-test-id="pv-section-sale-price-history"
      >
        <VariantSalePriceHistoryPanel
          items={historyItems}
          loading={historyLoading}
          error={historyError}
          formatMoney={formatMoney}
        />
      </section>
    ) : null}
    </div>
  );
}

export function VariantDetailInventorySection({ productType, variant }: SectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [trackInventory, setTrackInventory] = useState(true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [minimumStock, setMinimumStock] = useState("0");
  const [minimumStockEnabled, setMinimumStockEnabled] = useState(false);
  const [maximumStock, setMaximumStock] = useState("0");
  const [maximumStockEnabled, setMaximumStockEnabled] = useState(false);
  const [reorderPoint, setReorderPoint] = useState("0");
  const [reorderPointEnabled, setReorderPointEnabled] = useState(false);
  const [storageDrafts, setStorageDrafts] = useState<StorageThresholdDraft[]>([]);
  const [breakdownReloadKey, setBreakdownReloadKey] = useState(0);

  const minimumVariantDraft = useMemo(
    () => ({ enabled: minimumStockEnabled, value: minimumStock }),
    [minimumStockEnabled, minimumStock],
  );
  const maximumVariantDraft = useMemo(
    () => ({ enabled: maximumStockEnabled, value: maximumStock }),
    [maximumStockEnabled, maximumStock],
  );
  const reorderVariantDraft = useMemo(
    () => ({ enabled: reorderPointEnabled, value: reorderPoint }),
    [reorderPointEnabled, reorderPoint],
  );

  useEffect(() => {
    if (editing) {
      return;
    }
    const isService = String(productType || "").toUpperCase() === "SERVICE";
    setTrackInventory(typeof variant.trackInventory === "boolean" ? variant.trackInventory : !isService);
    setAllowNegativeStock(variant.allowNegativeStock === true);
    setMinimumStockEnabled(variant.minimumStockEnabled === true);
    setMinimumStock(
      variant.minimumStock != null && Number.isFinite(Number(variant.minimumStock))
        ? String(Math.max(0, Math.round(Number(variant.minimumStock))))
        : "0",
    );
    setMaximumStockEnabled(variant.maximumStockEnabled === true);
    setMaximumStock(
      variant.maximumStock != null && Number.isFinite(Number(variant.maximumStock))
        ? String(Math.max(0, Math.round(Number(variant.maximumStock))))
        : "0",
    );
    setReorderPointEnabled(variant.reorderPointEnabled === true);
    setReorderPoint(
      variant.reorderPoint != null && Number.isFinite(Number(variant.reorderPoint))
        ? String(Math.max(0, Math.round(Number(variant.reorderPoint))))
        : "0",
    );
  }, [variant, productType, editing]);

  const ro = !editing;

  const displayTrack = variant.trackInventory !== false ? "Sí" : "No";
  const displayNeg = variant.allowNegativeStock ? "Sí" : "No";

  const toggleEditOrSave = () => {
    setError(null);
    if (!editing) {
      const vid = variant.id?.trim() ?? "";
      const sku = variant.sku?.trim() ?? "";
      setEditing(true);
      void (async () => {
        const r = await fetchVariantStockBreakdownAction({ variantId: vid, sku });
        if (r.ok) {
          setStorageDrafts(storageDraftsFromBreakdown(r.breakdown));
        }
      })();
      return;
    }
    const vid = variant.id?.trim() ?? "";
    if (!vid) {
      setError("Variante no válida");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await updateProductVariantInventoryPartialAction(vid, {
          trackInventory,
          allowNegativeStock,
          minimumStock: Math.max(0, Math.round(Number(minimumStock) || 0)),
          minimumStockEnabled,
          maximumStock: Math.max(0, Math.round(Number(maximumStock) || 0)),
          maximumStockEnabled,
          reorderPoint: Math.max(0, Math.round(Number(reorderPoint) || 0)),
          reorderPointEnabled,
        });
        if (!r.success) {
          setError(r.error);
          return;
        }
        const storage = await saveVariantStorageThresholdsAction({
          variantId: vid,
          storageThresholds: storageThresholdsPayloadFromDrafts(storageDrafts),
        });
        if (!storage.success) {
          setError(storage.error);
          return;
        }
        setEditing(false);
        setBreakdownReloadKey((k) => k + 1);
        await router.refresh();
      })();
    });
  };

  return (
    <section className={sectionCardClass(editing)} data-test-id="pv-section-inventory">
      <h2 className="text-sm font-semibold text-foreground">Configuración inventario</h2>
      {error ? <Alert variant="error">{error}</Alert> : null}

      {ro ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Control de inventario" name="pv-inv-track-ro" value={displayTrack} onChange={noop} readOnly />
          <TextField label="Stock negativo" name="pv-inv-neg-ro" value={displayNeg} onChange={noop} readOnly />
          <TextField
            label="Stock mínimo"
            name="pv-inv-min-ro"
            value={formatThresholdReadOnly(variant.minimumStockEnabled, variant.minimumStock)}
            onChange={noop}
            readOnly
          />
          <TextField
            label="Stock máximo"
            name="pv-inv-max-ro"
            value={formatThresholdReadOnly(variant.maximumStockEnabled, variant.maximumStock)}
            onChange={noop}
            readOnly
          />
          <TextField
            label="Punto de reposición"
            name="pv-inv-reorder-ro"
            value={formatThresholdReadOnly(variant.reorderPointEnabled, variant.reorderPoint)}
            onChange={noop}
            readOnly
          />
        </div>
      ) : (
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <Switch
            checked={trackInventory}
            onChange={setTrackInventory}
            label="Controlar inventario"
            labelPosition="right"
            data-test-id="pv-inv-track"
          />
          <Switch
            checked={allowNegativeStock}
            onChange={setAllowNegativeStock}
            label="Permitir stock negativo"
            labelPosition="right"
            data-test-id="pv-inv-neg"
          />
          <StockThresholdField
            label="Stock mínimo"
            name="pv-inv-min"
            enabled={minimumStockEnabled}
            onEnabledChange={setMinimumStockEnabled}
            value={minimumStock}
            onValueChange={setMinimumStock}
            dataTestId="pv-inv-min"
          />
          <StockThresholdField
            label="Stock máximo"
            name="pv-inv-max"
            enabled={maximumStockEnabled}
            onEnabledChange={setMaximumStockEnabled}
            value={maximumStock}
            onValueChange={setMaximumStock}
            dataTestId="pv-inv-max"
          />
          <StockThresholdField
            label="Punto de reposición"
            name="pv-inv-reorder"
            enabled={reorderPointEnabled}
            onEnabledChange={setReorderPointEnabled}
            value={reorderPoint}
            onValueChange={setReorderPoint}
            dataTestId="pv-inv-reorder"
          />
        </div>
      )}

      <VariantDetailStorageThresholdsBlock
        variantId={variant.id}
        sku={variant.sku}
        editing={!ro}
        minimumDraft={minimumVariantDraft}
        maximumDraft={maximumVariantDraft}
        reorderDraft={reorderVariantDraft}
        storageDrafts={storageDrafts}
        onStorageDraftsChange={setStorageDrafts}
        reloadKey={breakdownReloadKey}
      />

      <div className="absolute bottom-2 right-2">
        <IconButton
          icon={editing ? "Save" : "Pencil"}
          variant="action"
          size="sm"
          ariaLabel={editing ? "Guardar inventario" : "Editar inventario"}
          onClick={toggleEditOrSave}
          disabled={pending}
          isLoading={pending}
          data-test-id="pv-section-inventory-edit-save"
        />
      </div>
    </section>
  );
}
