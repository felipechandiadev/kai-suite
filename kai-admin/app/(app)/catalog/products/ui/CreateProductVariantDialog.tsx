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
import { createProductVariantAction } from "@/features/inventory-products/actions/product.action";
import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import { dimensionLabel, pickDefaultUnit } from "@/features/inventory-units/types/unit.types";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { listAttributesForPage } from "@/features/inventory-attributes/actions/attribute.action";
import type { AttributeListItem } from "@/features/inventory-attributes/types/attribute.types";
import {
  catalogDefaultIvaTaxIds,
  filterSelectableSaleTaxes,
} from "@/features/inventory-products/lib/sale-taxes";
import {
  deriveBasePriceFromPriceRows,
  netToGross,
  resolvePricingGrossFactor,
  roundMoneyInt,
} from "@/features/inventory-products/domain/price-tax-math";
import { DEFAULT_VARIANT_TAX_CATEGORY } from "@/features/inventory-products/types/variant-fiscal.types";
import {
  createVariantPriceRow,
  VariantPriceRowsEditor,
  type VariantPriceRowModel,
} from "./VariantPriceRowsEditor";
import { catalogProductTypeIsSellable } from "./catalog-product-type-options";
import { VariantPmpPriceCalculatorDialog } from "./VariantPmpPriceCalculatorDialog";
import { VariantJewelryPriceCalculatorDialog } from "./VariantJewelryPriceCalculatorDialog";
import { VariantWeightFields } from "./VariantWeightFields";
import { VariantAttributesPickerDialog } from "./VariantAttributesPickerDialog";
import {
  displayWeightToNetWeightKg,
  weightInGrams,
  type VariantWeightUnit,
} from "@/features/inventory-products/lib/variant-weight";

/** IVA marcado como predeterminado en catálogo; si no hay ninguno, se usa el primer IVA activo. */
export type CreateProductVariantDialogProps = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productType?: string;
  /** PMP de referencia (p. ej. promedio de variantes existentes); la variante nueva aún no tiene PMP en BD. */
  referencePmp?: number;
  onSuccess?: () => void | Promise<void>;
};

export function CreateProductVariantDialog({
  open,
  onClose,
  productId,
  productName,
  productType = "PHYSICAL",
  referencePmp = 0,
  onSuccess,
}: CreateProductVariantDialogProps) {
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
  const [units, setUnits] = useState<UnitListItem[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListListItem[]>([]);
  const [taxes, setTaxes] = useState<TaxListItem[]>([]);
  const [priceRows, setPriceRows] = useState<VariantPriceRowModel[]>([]);
  /** Fila para la que está abierta la calculadora PMP (null = cerrado). */
  const [pmpCalculatorRowKey, setPmpCalculatorRowKey] = useState<string | null>(null);
  const [jewelryCalculatorRowKey, setJewelryCalculatorRowKey] = useState<string | null>(null);
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState<VariantWeightUnit>("g");
  const [attributes, setAttributes] = useState<AttributeListItem[]>([]);
  /** attributeId → valor de opción elegido (null = sin definir). */
  const [attributeSelections, setAttributeSelections] = useState<Record<string, string | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [attributesPickerOpen, setAttributesPickerOpen] = useState(false);

  const catalogTaxes = useMemo(() => filterSelectableSaleTaxes(taxes), [taxes]);
  const defaultIvaTaxIds = useMemo(() => catalogDefaultIvaTaxIds(taxes), [taxes]);

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

  const completedPriceRows = useMemo(
    () => priceRows.filter((r) => Boolean(r.priceListId?.trim())),
    [priceRows],
  );

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

  /** `variant.basePrice` en API: neto de la primera fila con lista (orden del array). */
  const derivedBasePrice = useMemo(() => {
    if (completedPriceRows.length === 0) {
      return null;
    }
    return deriveBasePriceFromPriceRows(completedPriceRows);
  }, [completedPriceRows]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSku("");
    setBarcode("");
    setUnitId(null);
    setStockBaseUnitId(null);
    setPurchaseUnitId(null);
    setStockBaseQtyPerCountSaleUnit("");
    setStockBaseQtyPerCountPurchaseUnit("");
    setIsActive(true);
    setWeightValue("");
    setWeightUnit("g");
    setJewelryCalculatorRowKey(null);
    setPmpCalculatorRowKey(null);
    const isService = String(productType || "").toUpperCase() === "SERVICE";
    setTrackInventory(!isService);
    setAllowNegativeStock(false);
    setMinimumStock("0");
    setMaximumStock("0");
    setReorderPoint("0");
    setPriceRows([]);
    setAttributeSelections({});
    setError(null);
    setLoadError(null);
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
        const activePriceLists = pls.filter((p) => p.isActive);
        const defaultPriceListId =
          activePriceLists.find((p) => p.isDefault)?.id ?? activePriceLists[0]?.id ?? null;
        setPriceRows([createVariantPriceRow(defaultIva, defaultPriceListId)]);
        const defaultUnit = pickDefaultUnit(list);
        const du = defaultUnit?.id ?? null;
        setUnitId(du);
        setStockBaseUnitId(du);
        setPurchaseUnitId(du);
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
  }, [open]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    if (!productId.trim()) {
      setError("Producto no válido");
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
        const id = r.priceListId!.trim();
        if (dup.has(id)) {
          setError("No puede repetir la misma lista de precios en más de una fila.");
          return;
        }
        dup.add(id);
      }
      const derived = deriveBasePriceFromPriceRows(filteredRows);
      if (derived === null) {
        setError("No se pudo determinar el precio de referencia a partir de las filas.");
        return;
      }
      basePrice = derived;
      priceListItems = filteredRows.map((r) => ({
        priceListId: r.priceListId!.trim(),
        netPrice: roundMoneyInt(r.net),
        grossPrice: roundMoneyInt(r.gross),
        taxIds: r.taxIds.length > 0 ? r.taxIds : undefined,
        maxDiscountPercent: r.maxDiscountPercent,
        minPrice: r.minPrice,
      }));
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

    const netWeightKg = displayWeightToNetWeightKg(weightValue, weightUnit);

    startTransition(() => {
      void (async () => {
        const r = await createProductVariantAction({
          productId: productId.trim(),
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
          netWeightKg,
        });
        if (r.success) {
          await router.refresh();
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
        const f = resolvePricingGrossFactor(DEFAULT_VARIANT_TAX_CATEGORY, catalogTaxes, r.taxIds);
        const n = roundMoneyInt(net);
        return {
          ...r,
          net: n,
          gross: netToGross(n, f),
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
    Boolean(productId.trim()) &&
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
      title="Crear variante"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="product-variant-create-dialog"
      alertArea={
          <>
            {loadError ? (
              <Alert variant="error" data-test-id="product-variant-create-load-error">
                {loadError}
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="error" data-test-id="product-variant-create-error">
                {error}
              </Alert>
            ) : null}
          </>
        }
      actions={
          <>
            <Button
              variant="outlined"
              size="md"
              onClick={handleClose}
              disabled={isPending}
              data-test-id="product-variant-create-cancel"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!canSubmit}
              data-test-id="product-variant-create-submit"
            >
              Crear variante
            </Button>
          </>
      }
    >
        <div className="flex w-full min-w-0 flex-col gap-4">
          <p className="text-sm text-muted-foreground" data-test-id="product-variant-create-product">
            Producto: <span className="font-medium text-foreground">{productName || "—"}</span>
          </p>
          <div className="flex w-full min-w-0 flex-row gap-3">
            <div className="min-w-0 flex-1 basis-0">
              <TextField
                label="SKU"
                name="pv-create-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Código SKU"
                required
                className="w-full"
                data-test-id="product-variant-create-sku"
              />
            </div>
            <div className="min-w-0 flex-1 basis-0">
              <TextField
                label="Código de barras (opcional)"
                name="pv-create-barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Código de barras"
                className="w-full"
                data-test-id="product-variant-create-barcode"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <Select
              label="Unidad de venta"
              name="pv-create-unit-sale"
              options={unitOptions}
              value={unitId}
              onChange={(v) => setUnitId(v != null ? String(v) : null)}
              placeholder="Unidad"
              required
              disabled={unitOptions.length === 0}
              data-test-id="product-variant-create-unit"
            />
            <Select
              label="Unidad de stock (inventario)"
              name="pv-create-unit-stock"
              options={unitOptions}
              value={stockBaseUnitId}
              onChange={(v) => setStockBaseUnitId(v != null ? String(v) : null)}
              placeholder="Unidad base de inventario"
              required
              disabled={unitOptions.length === 0}
              data-test-id="product-variant-create-unit-stock"
            />
            <Select
              label="Unidad de compra por defecto"
              name="pv-create-unit-purchase"
              options={unitOptions}
              value={purchaseUnitId}
              onChange={(v) => setPurchaseUnitId(v != null ? String(v) : null)}
              placeholder="Unidad en órdenes de compra"
              required
              disabled={unitOptions.length === 0}
              data-test-id="product-variant-create-unit-purchase"
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
                name="pv-create-count-bridge-sale"
                value={stockBaseQtyPerCountSaleUnit}
                onChange={(e) => setStockBaseQtyPerCountSaleUnit(e.target.value)}
                placeholder="Ej: 250"
                className="w-full"
                data-test-id="product-variant-create-count-bridge-sale"
              />
            ) : null}
            {needsCountPurchaseBridge ? (
              <TextField
                label={`Contenido por 1 unidad de compra (${stockUnitMeta?.symbol || stockUnitMeta?.name || "stock base"})`}
                name="pv-create-count-bridge-purchase"
                value={stockBaseQtyPerCountPurchaseUnit}
                onChange={(e) => setStockBaseQtyPerCountPurchaseUnit(e.target.value)}
                placeholder="Ej: 250"
                className="w-full"
                data-test-id="product-variant-create-count-bridge-purchase"
              />
            ) : null}
          </div>

          <VariantWeightFields
            weight={weightValue}
            weightUnit={weightUnit}
            onWeightChange={setWeightValue}
            onWeightUnitChange={setWeightUnit}
            testIdPrefix="product-variant-create-weight"
          />

          {selectableAttributes.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/15 p-3">
              <p className="text-sm font-medium text-foreground">Atributos (opcional)</p>
              <p className="text-xs text-muted-foreground">
                Defina la combinación de esta variante. Solo se envían los atributos con valor elegido.
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
                    data-test-id="product-variant-create-attrs-open"
                  >
                    Elegir valores
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {isSellable ? (
            <>
              <p className="text-xs text-muted-foreground">
                Use la calculadora <strong className="font-medium text-foreground">joyería</strong>{" "}
                (ícono gema) con el peso de la pieza y precios de metales, o la calculadora{" "}
                <strong className="font-medium text-foreground">PMP</strong> para margen de utilidad
                sobre el precio de venta.
              </p>
              <VariantPriceRowsEditor
                priceLists={priceLists}
                catalogTaxes={catalogTaxes}
                taxCategory={DEFAULT_VARIANT_TAX_CATEGORY}
                variantTaxIds={priceRows[0]?.taxIds ?? defaultIvaTaxIds}
                rows={priceRows}
                onRowsChange={setPriceRows}
                defaultIvaTaxIds={defaultIvaTaxIds}
                taxesEditable
                onOpenPmpCalculator={(rowKey) => setPmpCalculatorRowKey(rowKey)}
                onOpenJewelryCalculator={(rowKey) => setJewelryCalculatorRowKey(rowKey)}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground" data-test-id="product-variant-create-no-sale-price">
              Este producto es un insumo: no tiene precio de venta ni listas de precios.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/15 p-3 md:grid-cols-2">
            <Switch
              checked={trackInventory}
              onChange={setTrackInventory}
              label="Controlar inventario"
              labelPosition="right"
              data-test-id="product-variant-create-track-inventory"
            />
            <Switch
              checked={allowNegativeStock}
              onChange={setAllowNegativeStock}
              label="Permitir stock negativo"
              labelPosition="right"
              data-test-id="product-variant-create-allow-negative"
            />
            <StockThresholdField
              label="Stock mínimo"
              name="pv-create-minimum-stock"
              enabled={minimumStockEnabled}
              onEnabledChange={setMinimumStockEnabled}
              value={minimumStock}
              onValueChange={setMinimumStock}
              dataTestId="product-variant-create-minimum-stock"
            />
            <StockThresholdField
              label="Stock máximo"
              name="pv-create-maximum-stock"
              enabled={maximumStockEnabled}
              onEnabledChange={setMaximumStockEnabled}
              value={maximumStock}
              onValueChange={setMaximumStock}
              dataTestId="product-variant-create-maximum-stock"
            />
            <StockThresholdField
              label="Punto de reposición"
              name="pv-create-reorder-point"
              enabled={reorderPointEnabled}
              onEnabledChange={setReorderPointEnabled}
              value={reorderPoint}
              onValueChange={setReorderPoint}
              dataTestId="product-variant-create-reorder-point"
            />
          </div>

          <div className="pt-1">
            <Switch
              checked={isActive}
              onChange={setIsActive}
              label="Activa"
              labelPosition="right"
              data-test-id="product-variant-create-active"
            />
          </div>
        </div>
      </Dialog>
      <VariantPmpPriceCalculatorDialog
        open={pmpCalculatorRowKey != null}
        onClose={() => setPmpCalculatorRowKey(null)}
        initialPmp={Math.max(0, Math.round(Number(referencePmp) || 0))}
        taxCategory={DEFAULT_VARIANT_TAX_CATEGORY}
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
        data-test-id="product-variant-create-attrs-picker"
      />
    </>
  );
}
