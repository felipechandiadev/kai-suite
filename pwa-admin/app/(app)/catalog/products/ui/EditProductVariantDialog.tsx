"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { Switch } from "@kai/ui";
import { StockThresholdField } from "@/shared/components/StockThresholdField/StockThresholdField";
import { updateProductVariantAction } from "@/features/inventory-products/actions/product.action";
import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import { dimensionLabel } from "@/features/inventory-units/types/unit.types";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { listAttributesForPage } from "@/features/inventory-attributes/actions/attribute.action";
import type { AttributeListItem } from "@/features/inventory-attributes/types/attribute.types";
import type { ProductGridRow, ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import { catalogProductTypeIsSellable } from "./catalog-product-type-options";
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
} from "./VariantPriceRowsEditor";
import { VariantPmpPriceCalculatorDialog } from "./VariantPmpPriceCalculatorDialog";
import { VariantJewelryPriceCalculatorDialog } from "./VariantJewelryPriceCalculatorDialog";
import { VariantWeightFields } from "./VariantWeightFields";
import { VariantAttributesPickerDialog } from "./VariantAttributesPickerDialog";
import {
  displayWeightToNetWeightKg,
  netWeightKgToDisplay,
  weightInGrams,
  type VariantWeightUnit,
} from "@/features/inventory-products/lib/variant-weight";
import { EntityMultimediaPanel } from "./EntityMultimediaPanel";

function noop() {}

export type EditProductVariantDialogProps = {
  open: boolean;
  onClose: () => void;
  product: ProductGridRow;
  variant: ProductVariantGridRow;
  productType?: string | null;
  onSuccess?: () => void | Promise<void>;
};

export function EditProductVariantDialog({
  open,
  onClose,
  product,
  variant,
  productType = "PHYSICAL",
  onSuccess,
}: EditProductVariantDialogProps) {
  const isSellable = catalogProductTypeIsSellable(productType);
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [stockBaseUnitId, setStockBaseUnitId] = useState<string | null>(null);
  const [purchaseUnitId, setPurchaseUnitId] = useState<string | null>(null);
  const [stockBaseQtyPerCountSaleUnit, setStockBaseQtyPerCountSaleUnit] = useState("");
  const [stockBaseQtyPerCountPurchaseUnit, setStockBaseQtyPerCountPurchaseUnit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [trackInventory, setTrackInventory] = useState(true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [minimumStock, setMinimumStock] = useState("0");
  const [minimumStockEnabled, setMinimumStockEnabled] = useState(false);
  const [maximumStock, setMaximumStock] = useState("0");
  const [maximumStockEnabled, setMaximumStockEnabled] = useState(false);
  const [reorderPoint, setReorderPoint] = useState("0");
  const [reorderPointEnabled, setReorderPointEnabled] = useState(false);
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState<VariantWeightUnit>("g");
  const [grossWeightKg, setGrossWeightKg] = useState("");
  const [packageLengthCm, setPackageLengthCm] = useState("");
  const [packageWidthCm, setPackageWidthCm] = useState("");
  const [packageHeightCm, setPackageHeightCm] = useState("");
  const [volumetricDivisorK, setVolumetricDivisorK] = useState("");
  const [units, setUnits] = useState<UnitListItem[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListListItem[]>([]);
  const [taxes, setTaxes] = useState<TaxListItem[]>([]);
  const [priceRows, setPriceRows] = useState<VariantPriceRowModel[]>([]);
  const [pmpCalculatorRowKey, setPmpCalculatorRowKey] = useState<string | null>(null);
  const [jewelryCalculatorRowKey, setJewelryCalculatorRowKey] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<AttributeListItem[]>([]);
  const [attributeSelections, setAttributeSelections] = useState<Record<string, string | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [attributesPickerOpen, setAttributesPickerOpen] = useState(false);

  const catalogTaxes = useMemo(() => filterSelectableSaleTaxes(taxes), [taxes]);
  const defaultIvaTaxIds = useMemo(() => catalogDefaultIvaTaxIds(taxes), [taxes]);
  const taxCategory = useMemo(
    () => normalizeVariantTaxCategory(variant.taxCategory),
    [variant.taxCategory],
  );
  const netEqualsGross = forcesNetEqualsGross(taxCategory);
  const dialogTaxIds = useMemo(
    () => resolveVariantTaxIds(variant, undefined, defaultIvaTaxIds),
    [variant, defaultIvaTaxIds],
  );

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

  const completedPriceRows = useMemo(
    () => priceRows.filter((r) => Boolean(r.priceListId?.trim())),
    [priceRows],
  );

  const derivedBasePrice = useMemo(() => {
    if (completedPriceRows.length === 0) {
      return null;
    }
    return deriveBasePriceFromPriceRows(completedPriceRows);
  }, [completedPriceRows]);

  useEffect(() => {
    if (!open || !variant?.id) {
      return;
    }
    setLoadError(null);
    setError(null);
    void (async () => {
      try {
        const [list, pls, txs, attrs] = await Promise.all([
          listUnitsForPage(),
          listPriceListsForPage(),
          listTaxesForPage(),
          listAttributesForPage(),
        ]);
        setUnits(list);
        setPriceLists(pls);
        setTaxes(txs);
        setAttributes(attrs);

        const defaultIva = catalogDefaultIvaTaxIds(txs);
        const master = resolveVariantTaxIds(variant, undefined, defaultIva);
        setPriceRows(priceListItemsToVariantRows(variant.priceListItems ?? [], master));
        setSku(variant.sku ?? "");
        setBarcode(variant.barcode?.trim() ?? "");
        const saleId =
          (variant as { saleUnitId?: string }).saleUnitId?.trim() ||
          variant.unitId?.trim() ||
          null;
        setUnitId(saleId);
        setStockBaseUnitId(
          variant.stockBaseUnitId?.trim()
            ? variant.stockBaseUnitId.trim()
            : saleId,
        );
        setPurchaseUnitId(
          variant.purchaseUnitId?.trim() ? variant.purchaseUnitId.trim() : saleId,
        );
        setStockBaseQtyPerCountSaleUnit(
          variant.stockBaseQtyPerCountSaleUnit != null &&
            Number.isFinite(Number(variant.stockBaseQtyPerCountSaleUnit))
            ? String(variant.stockBaseQtyPerCountSaleUnit)
            : "",
        );
        setStockBaseQtyPerCountPurchaseUnit(
          variant.stockBaseQtyPerCountPurchaseUnit != null &&
            Number.isFinite(Number(variant.stockBaseQtyPerCountPurchaseUnit))
            ? String(variant.stockBaseQtyPerCountPurchaseUnit)
            : "",
        );
        setIsActive(variant.isActive !== false);
        const isService = String(productType || "").toUpperCase() === "SERVICE";
        setTrackInventory(
          typeof variant.trackInventory === "boolean" ? variant.trackInventory : !isService,
        );
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
        const weightDisplay = netWeightKgToDisplay(
          variant.netWeightKg != null && Number.isFinite(Number(variant.netWeightKg))
            ? Number(variant.netWeightKg)
            : null,
        );
        setWeightValue(weightDisplay.value);
        setWeightUnit(weightDisplay.unit);
        setGrossWeightKg(
          variant.grossWeightKg != null && Number.isFinite(Number(variant.grossWeightKg))
            ? String(variant.grossWeightKg)
            : "",
        );
        setPackageLengthCm(
          variant.packageLengthCm != null && Number.isFinite(Number(variant.packageLengthCm))
            ? String(variant.packageLengthCm)
            : "",
        );
        setPackageWidthCm(
          variant.packageWidthCm != null && Number.isFinite(Number(variant.packageWidthCm))
            ? String(variant.packageWidthCm)
            : "",
        );
        setPackageHeightCm(
          variant.packageHeightCm != null && Number.isFinite(Number(variant.packageHeightCm))
            ? String(variant.packageHeightCm)
            : "",
        );
        setVolumetricDivisorK(
          variant.volumetricDivisorK != null && Number.isFinite(Number(variant.volumetricDivisorK))
            ? String(Math.round(Number(variant.volumetricDivisorK)))
            : "",
        );
        const attrSel: Record<string, string | null> = {};
        const activeAttrs = [...attrs]
          .filter((a) => a.isActive && Array.isArray(a.options) && a.options.length > 0)
          .sort((a, b) => {
            const o = a.displayOrder - b.displayOrder;
            return o !== 0 ? o : a.name.localeCompare(b.name, "es", { sensitivity: "base" });
          });
        const av = variant.attributeValues ?? {};
        for (const a of activeAttrs) {
          const raw = av[a.id];
          attrSel[a.id] = raw != null && String(raw).trim() !== "" ? String(raw).trim() : null;
        }
        setAttributeSelections(attrSel);

        if (list.length === 0) {
          setLoadError("No hay unidades de medida. Cree una en Inventario → Unidades.");
        } else if (!list.some((u) => u.active)) {
          setLoadError("No hay unidades de medida activas. Active al menos una en Inventario → Unidades.");
        } else if (!pls.some((p) => p.isActive)) {
          setLoadError("No hay listas de precios activas. Cree una en Ventas → Listas de precios.");
        }
      } catch {
        setLoadError("No se pudieron cargar unidades, listas de precios o impuestos.");
      }
    })();
  }, [
    open,
    variant.id,
    variant.sku,
    variant.unitId,
    variant.stockBaseUnitId,
    variant.purchaseUnitId,
    (variant as { saleUnitId?: string | null }).saleUnitId,
    variant.stockBaseQtyPerCountSaleUnit,
    variant.stockBaseQtyPerCountPurchaseUnit,
    variant.minimumStock,
    variant.minimumStockEnabled,
    variant.maximumStock,
    variant.maximumStockEnabled,
    variant.reorderPoint,
    variant.reorderPointEnabled,
    variant.netWeightKg,
    variant.grossWeightKg,
    variant.packageLengthCm,
    variant.packageWidthCm,
    variant.packageHeightCm,
    variant.volumetricDivisorK,
    productType,
  ]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    const pid = product.id?.trim() ?? "";
    const vid = variant.id?.trim() ?? "";
    if (!pid || !vid) {
      setError("Datos de producto o variante no válidos");
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

    let basePrice = 0;
    let priceListItems: Array<{
      priceListId: string;
      netPrice: number;
      grossPrice: number;
      taxIds?: string[];
      maxDiscountPercent?: number | null;
      minPrice?: number | null;
    }> = [];

    if (isSellable) {
      const incompleteRow = priceRows.some((r) => !r.priceListId?.trim());
      if (incompleteRow) {
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
      const derived = deriveBasePriceFromPriceRows(filteredRows);
      if (derived === null) {
        setError("No se pudo determinar el precio de referencia a partir de las filas.");
        return;
      }
      basePrice = derived;
      if (netEqualsGross) {
        const mismatch = filteredRows.some((r) => roundMoneyInt(r.net) !== roundMoneyInt(r.gross));
        if (mismatch) {
          setError("Para este tratamiento SII el precio neto debe ser igual al precio con impuestos.");
          return;
        }
      }
      priceListItems = filteredRows.map((r) => {
        const netPrice = roundMoneyInt(r.net);
        const grossPrice = netEqualsGross ? netPrice : roundMoneyInt(r.gross);
        return {
          priceListId: r.priceListId!.trim(),
          netPrice,
          grossPrice,
          taxIds: netEqualsGross ? undefined : r.taxIds.length > 0 ? r.taxIds : undefined,
          maxDiscountPercent: r.maxDiscountPercent,
          minPrice: r.minPrice,
        };
      });
    }

    const attributeValues: Record<string, string> = {};
    for (const a of selectableAttributes) {
      const raw = attributeSelections[a.id];
      if (raw == null || String(raw).trim() === "") {
        continue;
      }
      const val = String(raw).trim();
      if (!a.options.includes(val)) {
        setError(`El valor seleccionado no es válido para «${a.name}».`);
        return;
      }
      attributeValues[a.id] = val;
    }
    const attributeValuesPayload =
      Object.keys(attributeValues).length > 0 ? attributeValues : undefined;

    let stockBaseQtyPerCountSaleUnitOut: number | undefined;
    let stockBaseQtyPerCountPurchaseUnitOut: number | undefined;
    if (needsCountSaleBridge) {
      const n = Number(String(stockBaseQtyPerCountSaleUnit).replace(",", ".").trim());
      if (!Number.isFinite(n) || n <= 0) {
        setError(
          `Indique cuánto stock (${dimensionLabel(stockUnitMeta!.dimension)} en ${stockUnitMeta!.symbol || stockUnitMeta!.name}) equivale 1 unidad de venta (${saleUnitMeta?.symbol || saleUnitMeta?.name}). Use un número > 0.`,
        );
        return;
      }
      stockBaseQtyPerCountSaleUnitOut = n;
    }
    if (needsCountPurchaseBridge) {
      const n = Number(String(stockBaseQtyPerCountPurchaseUnit).replace(",", ".").trim());
      if (!Number.isFinite(n) || n <= 0) {
        setError(
          `Indique cuánto stock (${dimensionLabel(stockUnitMeta!.dimension)} en ${stockUnitMeta!.symbol || stockUnitMeta!.name}) equivale 1 unidad de compra (${purchaseUnitMeta?.symbol || purchaseUnitMeta?.name}). Use un número > 0.`,
        );
        return;
      }
      stockBaseQtyPerCountPurchaseUnitOut = n;
    }

    const parseOptDecimal = (s: string): number | null => {
      const t = s.trim();
      if (!t) {
        return null;
      }
      const n = Number(t.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };
    const volKRaw = volumetricDivisorK.trim();
    let volK: number | null = null;
    if (volKRaw) {
      const n = Math.round(Number(volKRaw));
      if (!Number.isFinite(n) || n <= 0) {
        setError("El divisor K volumétrico debe ser un entero mayor que 0.");
        return;
      }
      volK = n;
    }

    startTransition(() => {
      void (async () => {
        const netWeightKgOut = displayWeightToNetWeightKg(weightValue, weightUnit);
        const r = await updateProductVariantAction(vid, {
          productId: pid,
          sku: sku.trim(),
          barcode: barcode.trim() || null,
          basePrice,
          unitId: String(unitId),
          stockBaseUnitId: String(stockBaseUnitId),
          purchaseUnitId: String(purchaseUnitId),
          isActive,
          priceListItems,
          attributeValues: attributeValuesPayload,
          trackInventory,
          allowNegativeStock,
          minimumStock: Math.max(0, Math.round(Number(minimumStock) || 0)),
          minimumStockEnabled,
          maximumStock: Math.max(0, Math.round(Number(maximumStock) || 0)),
          maximumStockEnabled,
          reorderPoint: Math.max(0, Math.round(Number(reorderPoint) || 0)),
          reorderPointEnabled,
          stockBaseQtyPerCountSaleUnit: stockBaseQtyPerCountSaleUnitOut,
          stockBaseQtyPerCountPurchaseUnit: stockBaseQtyPerCountPurchaseUnitOut,
          netWeightKg: netWeightKgOut,
          grossWeightKg: parseOptDecimal(grossWeightKg),
          packageLengthCm: parseOptDecimal(packageLengthCm),
          packageWidthCm: parseOptDecimal(packageWidthCm),
          packageHeightCm: parseOptDecimal(packageHeightCm),
          volumetricDivisorK: volK,
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

  const handlePmpCalculatorApply = (
    _pmp: number,
    net: number,
    maxDiscountPercent: number,
    minPrice: number | null,
    priceRowKey: string,
  ) => {
    setPriceRows((prev) =>
      prev.map((r) => {
        if (r.key !== priceRowKey) {
          return r;
        }
        const f = resolvePricingGrossFactor(taxCategory, catalogTaxes, r.taxIds);
        const n = roundMoneyInt(net);
        const g = netEqualsGross ? n : netToGross(n, f);
        return {
          ...r,
          net: n,
          gross: g,
          maxDiscountPercent: maxDiscountPercent > 0 ? maxDiscountPercent : null,
          minPrice,
          lastEdited: "net" as const,
        };
      }),
    );
  };

  const handleJewelryCalculatorApply = (
    net: number,
    maxDiscountPercent: number,
    minPrice: number | null,
    priceRowKey: string,
  ) => {
    handlePmpCalculatorApply(0, net, maxDiscountPercent, minPrice, priceRowKey);
  };

  const syncWeightFromGrams = (grams: number) => {
    if (grams > 0) {
      setWeightValue(String(grams));
      setWeightUnit("g");
    }
  };

  const weightGrams = useMemo(
    () => weightInGrams(weightValue, weightUnit),
    [weightValue, weightUnit],
  );

  const canSubmit =
    Boolean(product.id?.trim()) &&
    Boolean(variant.id?.trim()) &&
    Boolean(sku.trim()) &&
    Boolean(unitId) &&
    Boolean(stockBaseUnitId) &&
    Boolean(purchaseUnitId) &&
    !isPending &&
    !loadError &&
    (isSellable
      ? !priceRows.some((r) => !r.priceListId?.trim()) &&
        priceRows.length > 0 &&
        derivedBasePrice !== null
      : true);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Editar variante"
        size="lg"
        scroll="paper"
        maxHeight="min(90vh, 720px)"
        data-test-id="product-variant-edit-dialog"
        alertArea={
          <>
            {loadError ? (
              <Alert variant="error" data-test-id="product-variant-edit-load-error">
                {loadError}
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="error" data-test-id="product-variant-edit-error">
                {error}
              </Alert>
            ) : null}
          </>
        }
        actions={
          <>
            <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="product-variant-edit-cancel">
              Cancelar
            </Button>
            <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="product-variant-edit-submit">
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-4">
          <p className="text-sm text-muted-foreground" data-test-id="product-variant-edit-product">
            Producto: <span className="font-medium text-foreground">{product.name || "—"}</span>
          </p>
          <div className="flex w-full min-w-0 flex-row gap-3">
            <div className="min-w-0 flex-1 basis-0">
              <TextField
                label="SKU"
                name="pv-edit-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Código SKU"
                required
                className="w-full"
                data-test-id="product-variant-edit-sku"
              />
            </div>
            <div className="min-w-0 flex-1 basis-0">
              <TextField
                label="Código de barras (opcional)"
                name="pv-edit-barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Código de barras"
                className="w-full"
                data-test-id="product-variant-edit-barcode"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <Select
              label="Unidad de venta"
              name="pv-edit-unit-sale"
              options={unitOptions}
              value={unitId}
              onChange={(v) => setUnitId(v != null ? String(v) : null)}
              placeholder="Unidad"
              required
              disabled={unitOptions.length === 0}
              data-test-id="product-variant-edit-unit"
            />
            <Select
              label="Unidad de stock (inventario)"
              name="pv-edit-unit-stock"
              options={unitOptions}
              value={stockBaseUnitId}
              onChange={(v) => setStockBaseUnitId(v != null ? String(v) : null)}
              placeholder="Unidad base de inventario"
              required
              disabled={unitOptions.length === 0}
              data-test-id="product-variant-edit-unit-stock"
            />
            <Select
              label="Unidad de compra por defecto"
              name="pv-edit-unit-purchase"
              options={unitOptions}
              value={purchaseUnitId}
              onChange={(v) => setPurchaseUnitId(v != null ? String(v) : null)}
              placeholder="Unidad en órdenes de compra"
              required
              disabled={unitOptions.length === 0}
              data-test-id="product-variant-edit-unit-purchase"
            />
            <p className="text-xs text-muted-foreground">
              Si el stock es masa, volumen o longitud y la venta o compra son de conteo (piezas), indique cuánto
              stock en la unidad base equivale a <span className="font-medium">1</span> unidad de venta o de compra.
              En el resto de casos las tres unidades deben ser convertibles en la misma cadena (o use la misma en las
              tres).
            </p>
            {needsCountSaleBridge ? (
              <TextField
                label={`Contenido por 1 unidad de venta (${stockUnitMeta?.symbol || stockUnitMeta?.name || "stock base"})`}
                name="pv-edit-count-bridge-sale"
                value={stockBaseQtyPerCountSaleUnit}
                onChange={(e) => setStockBaseQtyPerCountSaleUnit(e.target.value)}
                placeholder="Ej: 250"
                className="w-full"
                data-test-id="product-variant-edit-count-bridge-sale"
              />
            ) : null}
            {needsCountPurchaseBridge ? (
              <TextField
                label={`Contenido por 1 unidad de compra (${stockUnitMeta?.symbol || stockUnitMeta?.name || "stock base"})`}
                name="pv-edit-count-bridge-purchase"
                value={stockBaseQtyPerCountPurchaseUnit}
                onChange={(e) => setStockBaseQtyPerCountPurchaseUnit(e.target.value)}
                placeholder="Ej: 250"
                className="w-full"
                data-test-id="product-variant-edit-count-bridge-purchase"
              />
            ) : null}
          </div>

          {selectableAttributes.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/15 p-3">
              <p className="text-sm font-medium text-foreground">Atributos (opcional)</p>
              <p className="text-xs text-muted-foreground">
                Combinación de esta variante. Solo se envían los atributos con valor elegido.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5 text-sm">
                  {selectableAttributes.map((a) => (
                    <div key={a.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-medium text-foreground">
                        {attributeSelections[a.id] ?? "Sin definir"}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outlined"
                    size="sm"
                    onClick={() => setAttributesPickerOpen(true)}
                    data-test-id="product-variant-edit-attrs-open"
                  >
                    Elegir valores
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <VariantWeightFields
            weight={weightValue}
            weightUnit={weightUnit}
            onWeightChange={setWeightValue}
            onWeightUnitChange={setWeightUnit}
            testIdPrefix="product-variant-edit-weight"
          />

          <TextField
            label="PMP (precio medio ponderado)"
            name="pv-edit-pmp-readonly"
            value={
              variant.pmp != null && Number.isFinite(variant.pmp)
                ? String(Math.round(variant.pmp))
                : "Sin PMP — se define con la primera compra"
            }
            onChange={noop}
            readOnly
            data-test-id="product-variant-edit-pmp-readonly"
          />
          {isSellable ? (
            <VariantPriceRowsEditor
              priceLists={priceLists}
              catalogTaxes={catalogTaxes}
              taxCategory={taxCategory}
              variantTaxIds={priceRows[0]?.taxIds ?? dialogTaxIds}
              rows={priceRows}
              onRowsChange={setPriceRows}
              defaultIvaTaxIds={defaultIvaTaxIds}
              taxesEditable
              onOpenPmpCalculator={(rowKey) => setPmpCalculatorRowKey(rowKey)}
              onOpenJewelryCalculator={(rowKey) => setJewelryCalculatorRowKey(rowKey)}
            />
          ) : (
            <p className="text-xs text-muted-foreground" data-test-id="product-variant-edit-no-sale-price">
              Este producto es un insumo: no tiene precio de venta ni listas de precios.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/15 p-3 md:grid-cols-2">
            <Switch
              checked={trackInventory}
              onChange={setTrackInventory}
              label="Controlar inventario"
              labelPosition="right"
              data-test-id="product-variant-edit-track-inventory"
            />
            <Switch
              checked={allowNegativeStock}
              onChange={setAllowNegativeStock}
              label="Permitir stock negativo"
              labelPosition="right"
              data-test-id="product-variant-edit-allow-negative"
            />
            <StockThresholdField
              label="Stock mínimo"
              name="pv-edit-minimum-stock"
              enabled={minimumStockEnabled}
              onEnabledChange={setMinimumStockEnabled}
              value={minimumStock}
              onValueChange={setMinimumStock}
              dataTestId="product-variant-edit-minimum-stock"
            />
            <StockThresholdField
              label="Stock máximo"
              name="pv-edit-maximum-stock"
              enabled={maximumStockEnabled}
              onEnabledChange={setMaximumStockEnabled}
              value={maximumStock}
              onValueChange={setMaximumStock}
              dataTestId="product-variant-edit-maximum-stock"
            />
            <StockThresholdField
              label="Punto de reposición"
              name="pv-edit-reorder-point"
              enabled={reorderPointEnabled}
              onEnabledChange={setReorderPointEnabled}
              value={reorderPoint}
              onValueChange={setReorderPoint}
              dataTestId="product-variant-edit-reorder-point"
            />
          </div>
          <div className="pt-1">
            <Switch
              checked={isActive}
              onChange={setIsActive}
              label="Activa"
              labelPosition="right"
              data-test-id="product-variant-edit-active"
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/10 p-3">
            <p className="text-sm font-medium text-foreground">Despacho (courier / ERP)</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Opcional: peso bruto en kg; empaque L×W×H en cm; divisor K (p. ej. 5000) para peso volumétrico.
              El peso neto de la pieza se define arriba (joyería).
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextField
                label="Peso bruto (kg)"
                name="pv-edit-gross-kg"
                value={grossWeightKg}
                onChange={(e) => setGrossWeightKg(e.target.value)}
                placeholder="Con embalaje"
              />
              <TextField
                label="Largo empaque (cm)"
                name="pv-edit-pkg-l"
                value={packageLengthCm}
                onChange={(e) => setPackageLengthCm(e.target.value)}
              />
              <TextField
                label="Ancho empaque (cm)"
                name="pv-edit-pkg-w"
                value={packageWidthCm}
                onChange={(e) => setPackageWidthCm(e.target.value)}
              />
              <TextField
                label="Alto empaque (cm)"
                name="pv-edit-pkg-h"
                value={packageHeightCm}
                onChange={(e) => setPackageHeightCm(e.target.value)}
              />
              <TextField
                label="Divisor K volumétrico"
                name="pv-edit-vol-k"
                value={volumetricDivisorK}
                onChange={(e) => setVolumetricDivisorK(e.target.value)}
                placeholder="5000 típico"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <EntityMultimediaPanel
              entityType="product-variant"
              entityId={variant.id}
              title="Imágenes de la variante"
              collectionOnly
              onChanged={() => router.refresh()}
            />
          </div>
        </div>
      </Dialog>
      <VariantPmpPriceCalculatorDialog
        open={pmpCalculatorRowKey != null}
        onClose={() => setPmpCalculatorRowKey(null)}
        initialPmp={
          variant.pmp != null && Number.isFinite(variant.pmp) ? Math.max(0, Math.round(variant.pmp)) : 0
        }
        taxCategory={taxCategory}
        priceRowKey={pmpCalculatorRowKey}
        taxIdsForPreview={
          pmpCalculatorRowKey != null
            ? (priceRows.find((r) => r.key === pmpCalculatorRowKey)?.taxIds ?? [])
            : []
        }
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
      <VariantAttributesPickerDialog
        open={attributesPickerOpen}
        onClose={() => setAttributesPickerOpen(false)}
        attributes={selectableAttributes}
        selections={attributeSelections}
        onSave={(next) =>
          setAttributeSelections((prev) => ({
            ...prev,
            ...next,
          }))
        }
        data-test-id="product-variant-edit-attrs-picker"
      />
    </>
  );
}
