"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, TextField } from "@kai/ui";
import type { TaxListItem } from "../types/tax.types";
import {
  effectiveIvaFactor,
  netFromPmpAndUtilityPercent,
  netToGross,
} from "../lib/price-tax-math";

type Props = {
  open: boolean;
  onClose: () => void;
  initialPmp: number;
  taxIdsForPreview: readonly string[];
  ivaTaxes: readonly TaxListItem[];
  onApply: (pmp: number, net: number) => void;
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
    utilityPct != null
      ? netFromPmpAndUtilityPercent(pmpInt, utilityPct)
      : netFromPmpAndUtilityPercent(pmpInt, 0);
  const factorPreview = effectiveIvaFactor(ivaTaxes, taxIdsForPreview);
  const grossPreview = netToGross(netSuggested, factorPreview);

  const handleApply = () => {
    const u = utilityPct ?? 0;
    const net = netFromPmpAndUtilityPercent(pmpInt, u);
    onApply(pmpInt, net);
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
          <Button variant="primary" type="button" onClick={handleApply}>
            Aplicar precio
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          Indique el PMP y la utilidad esperada % sobre ese costo. Precio neto sugerido: PMP × (1 +
          utilidad%).
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
          label="Utilidad esperada (%)"
          name="pmp-calc-utility"
          value={utilityRaw}
          onChange={(e) => setUtilityRaw(e.target.value)}
          placeholder="Ej: 35"
        />
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
