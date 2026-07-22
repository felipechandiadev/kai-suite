"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import {
  evaluateMaxDiscountImpact,
  minPriceFromMaxDiscount,
  netFromCostAndMargin,
  netToGross,
  resolvePricingGrossFactor,
} from "@/features/inventory-products/domain/price-tax-math";
import {
  forcesNetEqualsGross,
  type VariantTaxCategory,
} from "@/features/inventory-products/types/variant-fiscal.types";

export type VariantPmpPriceCalculatorDialogProps = {
  open: boolean;
  onClose: () => void;
  /** PMP inicial (p. ej. referencia de otras variantes o 0 si no hay). */
  initialPmp: number;
  taxCategory: VariantTaxCategory;
  taxIdsForPreview: readonly string[];
  /** Fila de precio a la que aplica el neto al confirmar (misma que abrió el diálogo). */
  priceRowKey: string | null;
  catalogTaxes: readonly TaxListItem[];
  onApply: (
    pmp: number,
    net: number,
    maxDiscountPercent: number,
    minPrice: number | null,
    priceRowKey: string,
  ) => void;
};

function parsePercent(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") {
    return null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function VariantPmpPriceCalculatorDialog({
  open,
  onClose,
  initialPmp,
  taxCategory,
  taxIdsForPreview,
  priceRowKey,
  catalogTaxes,
  onApply,
}: VariantPmpPriceCalculatorDialogProps) {
  const netEqualsGross = forcesNetEqualsGross(taxCategory);
  const [pmpValue, setPmpValue] = useState(String(Math.max(0, Math.round(initialPmp))));
  const [utilityRaw, setUtilityRaw] = useState("");
  const [discountRaw, setDiscountRaw] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setPmpValue(String(Math.max(0, Math.round(initialPmp))));
    setUtilityRaw("");
    setDiscountRaw("");
  }, [open, initialPmp]);

  const pmpInt = useMemo(() => {
    const d = pmpValue.replace(/\D/g, "");
    if (d === "") {
      return 0;
    }
    const n = Number.parseInt(d, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [pmpValue]);

  const utilityPct = parsePercent(utilityRaw);
  const discountPct = parsePercent(discountRaw);
  const marginInvalid = utilityPct != null && utilityPct >= 100;
  const discountInvalid = discountPct != null && discountPct >= 100;
  const expectedMargin = utilityPct ?? 0;
  const maxDiscount = discountPct ?? 0;
  const netSuggested =
    marginInvalid || discountInvalid ? 0 : netFromCostAndMargin(pmpInt, expectedMargin);
  const factorPreview = resolvePricingGrossFactor(taxCategory, catalogTaxes, taxIdsForPreview);
  const grossPreview = netToGross(netSuggested, factorPreview);
  const discountImpact = useMemo(
    () =>
      evaluateMaxDiscountImpact(pmpInt, netSuggested, expectedMargin, maxDiscount),
    [pmpInt, netSuggested, expectedMargin, maxDiscount],
  );
  const showDiscountWarning =
    maxDiscount > 0 && !marginInvalid && !discountInvalid && discountImpact.isMarginEroded;

  const handleApply = () => {
    if (priceRowKey == null || priceRowKey === "") {
      onClose();
      return;
    }
    if (marginInvalid || discountInvalid) {
      return;
    }
    const net = netFromCostAndMargin(pmpInt, expectedMargin);
    const minPrice =
      maxDiscount > 0 ? minPriceFromMaxDiscount(net, maxDiscount) : null;
    onApply(pmpInt, net, maxDiscount, minPrice, priceRowKey);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Calculadora precio de venta"
      size="md"
      zIndex={2000}
      scroll="paper"
      data-test-id="variant-pmp-calculator-dialog"
      actions={
        <>
          <Button variant="outlined" size="md" onClick={onClose} data-test-id="variant-pmp-calc-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleApply}
            disabled={marginInvalid || discountInvalid}
            data-test-id="variant-pmp-calc-apply"
          >
            Aplicar precio
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          El <strong className="text-foreground">margen de utilidad esperado</strong> es el % de
          ganancia sobre el precio neto de venta. Fórmula:{" "}
          <strong className="text-foreground">neto = PMP ÷ (1 − margen)</strong>. El máximo descuento
          autorizado no modifica el precio: es un tope; si lo aplicás y se pierde el margen, se avisa
          abajo.
        </p>
        <TextField
          type="currency"
          currencySymbol="$"
          allowDecimalComma={false}
          label="PMP"
          name="pmp-calc-pmp"
          value={pmpValue}
          placeholder="$ 0"
          onChange={(e) => setPmpValue(e.target.value)}
          data-test-id="variant-pmp-calc-pmp"
        />
        <TextField
          label="Margen de utilidad esperado"
          name="pmp-calc-utility"
          value={utilityRaw}
          onChange={(e) => setUtilityRaw(e.target.value)}
          placeholder="Margen de utilidad esperado"
          data-test-id="variant-pmp-calc-utility"
        />
        <TextField
          label="Máximo descuento autorizado"
          name="pmp-calc-discount"
          value={discountRaw}
          onChange={(e) => setDiscountRaw(e.target.value)}
          placeholder="Máximo descuento autorizado"
          data-test-id="variant-pmp-calc-discount"
        />
        {marginInvalid || discountInvalid ? (
          <p className="text-xs text-error" data-test-id="variant-pmp-calc-rate-error">
            Margen y descuento deben ser menores a 100%.
          </p>
        ) : null}
        {showDiscountWarning ? (
          <p className="text-sm font-medium text-error" data-test-id="variant-pmp-calc-discount-warn">
            {discountImpact.isBelowCost
              ? `Con el máximo descuento autorizado (${maxDiscount}%) el neto quedaría en $${discountImpact.netAfterMaxDiscount.toLocaleString("es-CL")}, por debajo del PMP ($${pmpInt.toLocaleString("es-CL")}). Se pierde el margen.`
              : `Con el máximo descuento autorizado (${maxDiscount}%) el margen efectivo baja a ${
                  discountImpact.effectiveMarginPercent != null
                    ? `${discountImpact.effectiveMarginPercent.toFixed(1)}%`
                    : "—"
                } (esperado ${expectedMargin}%). Se pierde el margen de utilidad esperado.`}
          </p>
        ) : null}
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vista previa</p>
          {netEqualsGross ? (
            <p className="mt-1 tabular-nums text-foreground" data-test-id="variant-pmp-calc-preview-sale">
              Precio de venta sugerido:{" "}
              <span className="font-semibold">${netSuggested.toLocaleString("es-CL")}</span>
            </p>
          ) : (
            <>
              <p className="mt-1 tabular-nums text-foreground" data-test-id="variant-pmp-calc-preview-net">
                Precio neto sugerido: <span className="font-semibold">${netSuggested.toLocaleString("es-CL")}</span>
              </p>
              <p className="mt-0.5 tabular-nums text-muted-foreground" data-test-id="variant-pmp-calc-preview-gross">
                Precio con impuestos:{" "}
                <span className="font-medium text-foreground">${grossPreview.toLocaleString("es-CL")}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
