"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, TextField } from "@kai/ui";
import type { TaxListItem } from "../types/tax.types";
import {
  effectiveIvaFactor,
  evaluateMaxDiscountImpact,
  minPriceFromMaxDiscount,
  netFromCostAndMargin,
  netToGross,
} from "../lib/price-tax-math";

type Props = {
  open: boolean;
  onClose: () => void;
  initialPmp: number;
  taxIdsForPreview: readonly string[];
  ivaTaxes: readonly TaxListItem[];
  onApply: (
    pmp: number,
    net: number,
    maxDiscountPercent: number,
    minPrice: number | null,
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
  taxIdsForPreview,
  ivaTaxes,
  onApply,
}: Props) {
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
  const factorPreview = effectiveIvaFactor(ivaTaxes, taxIdsForPreview);
  const grossPreview = netToGross(netSuggested, factorPreview);
  const discountImpact = useMemo(
    () => evaluateMaxDiscountImpact(pmpInt, netSuggested, expectedMargin, maxDiscount),
    [pmpInt, netSuggested, expectedMargin, maxDiscount],
  );
  const showDiscountWarning =
    maxDiscount > 0 && !marginInvalid && !discountInvalid && discountImpact.isMarginEroded;

  const handleApply = () => {
    if (marginInvalid || discountInvalid) {
      return;
    }
    const net = netFromCostAndMargin(pmpInt, expectedMargin);
    const minPrice =
      maxDiscount > 0 ? minPriceFromMaxDiscount(net, maxDiscount) : null;
    onApply(pmpInt, net, maxDiscount, minPrice);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Calculadora precio de venta"
      size="md"
      scroll="paper"
      data-test-id="variant-pmp-calculator-dialog"
      actions={
        <>
          <Button variant="outlined" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleApply}
            disabled={marginInvalid || discountInvalid}
          >
            Aplicar precio
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          Margen de utilidad esperado sobre el precio neto de venta. Fórmula: neto = PMP ÷ (1 −
          margen). El máximo descuento autorizado no modifica el precio.
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
        />
        <TextField
          label="Margen de utilidad esperado"
          name="pmp-calc-utility"
          value={utilityRaw}
          onChange={(e) => setUtilityRaw(e.target.value)}
          placeholder="Margen de utilidad esperado"
        />
        <TextField
          label="Máximo descuento autorizado"
          name="pmp-calc-discount"
          value={discountRaw}
          onChange={(e) => setDiscountRaw(e.target.value)}
          placeholder="Máximo descuento autorizado"
        />
        {marginInvalid || discountInvalid ? (
          <p className="text-xs text-error">Margen y descuento deben ser menores a 100%.</p>
        ) : null}
        {showDiscountWarning ? (
          <p className="text-sm font-medium text-error">
            {discountImpact.isBelowCost
              ? "Con el máximo descuento autorizado el neto quedaría bajo el PMP. Se pierde el margen."
              : `Con el máximo descuento autorizado el margen efectivo baja a ${
                  discountImpact.effectiveMarginPercent != null
                    ? `${discountImpact.effectiveMarginPercent.toFixed(1)}%`
                    : "—"
                }. Se pierde el margen esperado.`}
          </p>
        ) : null}
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vista previa
          </p>
          <p className="mt-1 tabular-nums text-foreground">
            Precio neto sugerido:{" "}
            <span className="font-semibold">${netSuggested.toLocaleString("es-CL")}</span>
          </p>
          <p className="mt-0.5 tabular-nums text-muted-foreground">
            Precio con impuestos:{" "}
            <span className="font-medium text-foreground">
              ${grossPreview.toLocaleString("es-CL")}
            </span>
          </p>
        </div>
      </div>
    </Dialog>
  );
}
