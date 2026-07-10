"use client";

import { useEffect, useMemo, useState } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import {
  netFromPmpAndUtilityPercent,
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
  onApply: (pmp: number, net: number, priceRowKey: string) => void;
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

  useEffect(() => {
    if (!open) {
      return;
    }
    setPmpValue(String(Math.max(0, Math.round(initialPmp))));
    setUtilityRaw("");
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
  const netSuggested =
    utilityPct != null ? netFromPmpAndUtilityPercent(pmpInt, utilityPct) : netFromPmpAndUtilityPercent(pmpInt, 0);
  const factorPreview = resolvePricingGrossFactor(taxCategory, catalogTaxes, taxIdsForPreview);
  const grossPreview = netToGross(netSuggested, factorPreview);

  const handleApply = () => {
    if (priceRowKey == null || priceRowKey === "") {
      onClose();
      return;
    }
    const u = utilityPct ?? 0;
    const net = netFromPmpAndUtilityPercent(pmpInt, u);
    onApply(pmpInt, net, priceRowKey);
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
          <Button variant="primary" size="md" onClick={handleApply} data-test-id="variant-pmp-calc-apply">
            Aplicar precio
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          Indique el <strong className="text-foreground">PMP</strong> (precio de compra medio ponderado) y la{" "}
          <strong className="text-foreground">utilidad esperada</strong> % sobre ese costo. El precio neto sugerido es{" "}
          <strong className="text-foreground">PMP × (1 + utilidad%)</strong>.
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
          label="Utilidad esperada (%)"
          name="pmp-calc-utility"
          value={utilityRaw}
          onChange={(e) => setUtilityRaw(e.target.value)}
          placeholder="Ej: 35"
          data-test-id="variant-pmp-calc-utility"
        />
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
