"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  isWebSerialSupported,
  readScaleConfigFromStorage,
  readWeightFromScale,
} from "@kai/scale-service-client";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select } from "@kai/ui";
import { fetchMetalPricesForPage } from "@/features/metal-prices/lib/fetch-metal-prices-for-page";
import { METAL_SELECT_OPTIONS } from "@/features/metal-prices/lib/metal-options";
import { latestMetalPriceByMetal } from "@/features/metal-prices/lib/metal-price-latest";
import type { MetalTypeOption } from "@/features/metal-prices/types/metal-price.types";
import {
  computeJewelryNetPrice,
  computeJewelryTotalCost,
  parseJewelryMoneyField,
  parseJewelryPercent,
} from "@/features/inventory-products/domain/jewelry-price-math";
import {
  evaluateMaxDiscountImpact,
  minPriceFromMaxDiscount,
} from "@/features/inventory-products/domain/price-tax-math";

export type VariantJewelryPriceCalculatorDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Peso inicial en gramos (formulario de variante o BD). */
  weightGrams: number;
  /** Al cambiar o aplicar, sincroniza el peso con el formulario padre. */
  onWeightGramsChange?: (grams: number) => void;
  priceRowKey: string | null;
  onApply: (
    net: number,
    maxDiscountPercent: number,
    minPrice: number | null,
    priceRowKey: string,
  ) => void;
};

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function parseWeightGramsInput(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) {
    return 0;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Number(n.toFixed(3));
}

export function VariantJewelryPriceCalculatorDialog({
  open,
  onClose,
  weightGrams,
  onWeightGramsChange,
  priceRowKey,
  onApply,
}: VariantJewelryPriceCalculatorDialogProps) {
  const [selectedMetal, setSelectedMetal] = useState<MetalTypeOption>("Oro 18K");
  const [metalPrice, setMetalPrice] = useState<number | null>(null);
  const [metalPricesLoading, setMetalPricesLoading] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [merma, setMerma] = useState("0");
  const [utilidad, setUtilidad] = useState("0");
  const [descuento, setDescuento] = useState("0");
  const [costoPiedras, setCostoPiedras] = useState("0");
  const [manufacture, setManufacture] = useState("0");
  const [otrosCostos, setOtrosCostos] = useState("0");
  const [scaleReading, setScaleReading] = useState(false);
  const [scaleError, setScaleError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setWeightInput(weightGrams > 0 ? String(weightGrams) : "");
    setMerma("0");
    setUtilidad("0");
    setDescuento("0");
    setCostoPiedras("0");
    setManufacture("0");
    setOtrosCostos("0");
    setSelectedMetal("Oro 18K");
    setScaleError(null);
  }, [open, weightGrams]);

  useEffect(() => {
    if (!open || !selectedMetal) {
      return;
    }
    let cancelled = false;
    setMetalPricesLoading(true);
    void (async () => {
      try {
        const rows = await fetchMetalPricesForPage();
        if (cancelled) {
          return;
        }
        setMetalPrice(latestMetalPriceByMetal(rows, selectedMetal));
      } finally {
        if (!cancelled) {
          setMetalPricesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedMetal]);

  const effectiveWeightGrams = useMemo(() => parseWeightGramsInput(weightInput), [weightInput]);

  const jewelryInput = useMemo(
    () => ({
      weightGrams: effectiveWeightGrams,
      metalPricePerGram: metalPrice ?? 0,
      mermaPercent: parseJewelryPercent(merma),
      utilityPercent: parseJewelryPercent(utilidad),
      stonesCost: parseJewelryMoneyField(costoPiedras),
      laborCost: parseJewelryMoneyField(manufacture),
      otherCosts: parseJewelryMoneyField(otrosCostos),
    }),
    [
      effectiveWeightGrams,
      metalPrice,
      merma,
      utilidad,
      costoPiedras,
      manufacture,
      otrosCostos,
    ],
  );

  const netPrice = useMemo(() => computeJewelryNetPrice(jewelryInput), [jewelryInput]);
  const totalCost = useMemo(() => computeJewelryTotalCost(jewelryInput), [jewelryInput]);
  const expectedMargin = parseJewelryPercent(utilidad);
  const maxDiscount = parseJewelryPercent(descuento);
  const discountImpact = useMemo(
    () => evaluateMaxDiscountImpact(totalCost, netPrice, expectedMargin, maxDiscount),
    [totalCost, netPrice, expectedMargin, maxDiscount],
  );
  const showDiscountWarning = maxDiscount > 0 && discountImpact.isMarginEroded;

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
    const grams = parseWeightGramsInput(value);
    if (grams > 0) {
      onWeightGramsChange?.(grams);
    }
  };

  const handleReadScale = async () => {
    setScaleReading(true);
    setScaleError(null);
    try {
      const cfg = readScaleConfigFromStorage();
      if (!cfg.enabled) {
        setScaleError(
          "La balanza no está habilitada. Configure y active la balanza en Configuración → Balanza.",
        );
        return;
      }
      if (!isWebSerialSupported()) {
        setScaleError(
          "Web Serial no está disponible en este navegador. Use Chrome o Edge en el mismo equipo con la balanza.",
        );
        return;
      }
      const reading = await readWeightFromScale(cfg);
      const gramsText = String(reading.weightGrams);
      setWeightInput(gramsText);
      onWeightGramsChange?.(reading.weightGrams);
    } catch (err) {
      setScaleError(err instanceof Error ? err.message : "No se pudo leer la balanza.");
    } finally {
      setScaleReading(false);
    }
  };

  const scaleConfigHint = useMemo(() => {
    const cfg = readScaleConfigFromStorage();
    if (!cfg.enabled) {
      return (
        <Alert variant="info">
          Para leer peso automáticamente, configure la balanza en{" "}
          <Link href="/settings/scale" className="font-medium text-primary underline">
            Configuración → Balanza
          </Link>
          .
        </Alert>
      );
    }
    return null;
  }, [open]);

  const handleApply = () => {
    if (priceRowKey == null || priceRowKey === "") {
      onClose();
      return;
    }
    if (effectiveWeightGrams > 0) {
      onWeightGramsChange?.(effectiveWeightGrams);
    }
    const net = Math.round(netPrice);
    const minPrice = maxDiscount > 0 ? minPriceFromMaxDiscount(net, maxDiscount) : null;
    onApply(net, maxDiscount, minPrice, priceRowKey);
    onClose();
  };

  const weightMissing = effectiveWeightGrams <= 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Calculadora de precio (joyería)"
      size="md"
      zIndex={2000}
      scroll="paper"
      data-test-id="variant-jewelry-calculator-dialog"
      alertArea={
        weightMissing ? (
          <Alert variant="warning">
            Ingrese el peso de la pieza en gramos (campo abajo) para calcular el precio.
          </Alert>
        ) : metalPrice == null && !metalPricesLoading ? (
          <Alert variant="warning">
            No hay precio registrado para {selectedMetal}. Configúrelo en Configuración → Precios de
            metales.
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={onClose} data-test-id="variant-jewelry-calc-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleApply}
            disabled={weightMissing || metalPrice == null}
            data-test-id="variant-jewelry-calc-apply"
          >
            Aplicar precio neto
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          El margen es % de ganancia sobre el precio neto de venta:{" "}
          <strong className="text-foreground">neto = costo ÷ (1 − margen)</strong>. El máximo
          descuento autorizado no modifica el precio; si al aplicarlo se pierde el margen, se avisa
          en rojo.
        </p>
        <Select
          label="Tipo de metal"
          value={selectedMetal}
          onChange={(v) => setSelectedMetal((v as MetalTypeOption) || "Oro 18K")}
          options={METAL_SELECT_OPTIONS}
          data-test-id="variant-jewelry-calc-metal"
        />
        <Alert variant="info">
          Precio del {selectedMetal}:{" "}
          <strong>
            {metalPricesLoading
              ? "Cargando…"
              : metalPrice != null
                ? fmtClp(metalPrice)
                : "No disponible"}
          </strong>{" "}
          <span className="text-muted-foreground">(CLP por gramo)</span>
        </Alert>
        <TextField
          label="Peso (gramos)"
          name="jewelry-calc-weight"
          value={weightInput}
          onChange={(e) => handleWeightChange(e.target.value)}
          placeholder="Ej: 5.2"
          inputMode="decimal"
          required
          data-test-id="variant-jewelry-calc-weight"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outlined"
            size="md"
            onClick={() => void handleReadScale()}
            disabled={scaleReading}
            data-test-id="variant-jewelry-calc-read-scale"
          >
            {scaleReading ? "Leyendo balanza…" : "Leer balanza"}
          </Button>
          <Link
            href="/settings/scale"
            className="text-xs text-primary underline"
            data-test-id="variant-jewelry-calc-scale-settings"
          >
            Configurar balanza
          </Link>
        </div>
        {scaleError ? <Alert variant="error">{scaleError}</Alert> : null}
        {scaleConfigHint}
        <TextField
          label="Merma (%)"
          name="jewelry-calc-merma"
          type="number"
          value={merma}
          onChange={(e) => setMerma(e.target.value)}
          selectOnFocus
          data-test-id="variant-jewelry-calc-merma"
        />
        <TextField
          label="Margen de utilidad esperado"
          name="jewelry-calc-utilidad"
          type="number"
          value={utilidad}
          onChange={(e) => setUtilidad(e.target.value)}
          placeholder="Margen de utilidad esperado"
          selectOnFocus
          data-test-id="variant-jewelry-calc-utilidad"
        />
        <TextField
          label="Máximo descuento autorizado"
          name="jewelry-calc-descuento"
          type="number"
          value={descuento}
          onChange={(e) => setDescuento(e.target.value)}
          placeholder="Máximo descuento autorizado"
          selectOnFocus
          data-test-id="variant-jewelry-calc-descuento"
        />
        {showDiscountWarning ? (
          <p className="text-sm font-medium text-error" data-test-id="variant-jewelry-calc-discount-warn">
            {discountImpact.isBelowCost
              ? `Con el máximo descuento autorizado (${maxDiscount}%) el neto quedaría bajo el costo. Se pierde el margen.`
              : `Con el máximo descuento autorizado (${maxDiscount}%) el margen efectivo baja a ${
                  discountImpact.effectiveMarginPercent != null
                    ? `${discountImpact.effectiveMarginPercent.toFixed(1)}%`
                    : "—"
                }. Se pierde el margen de utilidad esperado.`}
          </p>
        ) : null}
        <TextField
          label="Costo de piedras"
          name="jewelry-calc-piedras"
          type="currency"
          currencySymbol="$"
          value={costoPiedras}
          onChange={(e) => setCostoPiedras(e.target.value)}
          data-test-id="variant-jewelry-calc-piedras"
        />
        <TextField
          label="Hechura / mano de obra"
          name="jewelry-calc-labor"
          type="currency"
          currencySymbol="$"
          value={manufacture}
          onChange={(e) => setManufacture(e.target.value)}
          data-test-id="variant-jewelry-calc-labor"
        />
        <TextField
          label="Otros costos"
          name="jewelry-calc-other"
          type="currency"
          currencySymbol="$"
          value={otrosCostos}
          onChange={(e) => setOtrosCostos(e.target.value)}
          data-test-id="variant-jewelry-calc-other"
        />
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Precio neto calculado
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground" data-test-id="variant-jewelry-calc-preview">
            {fmtClp(netPrice)}
          </p>
          <p className="mt-1 text-[10px] italic text-muted-foreground">
            [(Peso × (1 + Merma%)) × PrecioMetal + Piedras + ManoObra + Otros] × (1 + Utilidad%)
          </p>
        </div>
      </div>
    </Dialog>
  );
}
