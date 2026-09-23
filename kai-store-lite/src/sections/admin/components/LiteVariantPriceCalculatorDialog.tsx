import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@kai/ui";
import {
  LITE_IVA_RATE,
  netFromCostAndMargin,
  netToGrossWithIva,
} from "@/lib/price-margin-math";

export type LiteVariantPriceCalculatorDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Costo de referencia (CLP enteros). */
  initialCost: number;
  onApply: (payload: { cost: number; salePrice: number }) => void;
};

function parsePercent(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const IVA_LABEL = `${Math.round(LITE_IVA_RATE * 100)}%`;

export function LiteVariantPriceCalculatorDialog({
  open,
  onClose,
  initialCost,
  onApply,
}: LiteVariantPriceCalculatorDialogProps) {
  const [costValue, setCostValue] = useState(
    String(Math.max(0, Math.round(initialCost))),
  );
  const [utilityRaw, setUtilityRaw] = useState("");

  useEffect(() => {
    if (!open) return;
    setCostValue(String(Math.max(0, Math.round(initialCost))));
    setUtilityRaw("");
  }, [open, initialCost]);

  const costInt = useMemo(() => {
    const d = costValue.replace(/\D/g, "");
    if (d === "") return 0;
    const n = Number.parseInt(d, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [costValue]);

  const utilityPct = parsePercent(utilityRaw);
  const marginInvalid = utilityPct != null && utilityPct >= 100;
  const expectedMargin = utilityPct ?? 0;
  const netSuggested = marginInvalid
    ? 0
    : netFromCostAndMargin(costInt, expectedMargin);
  const grossSuggested = netToGrossWithIva(netSuggested);

  function handleApply() {
    if (marginInvalid) return;
    const net = netFromCostAndMargin(costInt, expectedMargin);
    onApply({
      cost: costInt,
      salePrice: netToGrossWithIva(net),
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Calculadora precio de venta"
      size="md"
      data-test-id="lite-variant-price-calculator-dialog"
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={marginInvalid}
            data-test-id="lite-variant-price-calc-apply"
          >
            Aplicar precio
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          El <strong className="text-foreground">margen de utilidad esperado</strong> es el %
          de ganancia sobre el precio neto. Fórmula:{" "}
          <strong className="text-foreground">neto = costo ÷ (1 − margen)</strong>. Luego se
          suma IVA {IVA_LABEL} al precio de venta.
        </p>
        <TextField
          type="currency"
          currencySymbol="$"
          label="Costo"
          value={costValue}
          placeholder="Costo"
          onChange={(e) => setCostValue(e.target.value)}
          data-test-id="lite-variant-price-calc-cost"
        />
        <TextField
          label="Margen de utilidad esperado"
          value={utilityRaw}
          onChange={(e) => setUtilityRaw(e.target.value)}
          placeholder="Margen de utilidad esperado"
          data-test-id="lite-variant-price-calc-utility"
        />
        {marginInvalid ? (
          <Alert variant="error">El margen debe ser menor a 100%.</Alert>
        ) : null}
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vista previa
          </p>
          <p
            className="mt-1 tabular-nums text-foreground"
            data-test-id="lite-variant-price-calc-preview-net"
          >
            Precio neto sugerido:{" "}
            <span className="font-semibold">
              ${netSuggested.toLocaleString("es-CL")}
            </span>
          </p>
          <p
            className="mt-0.5 tabular-nums text-muted-foreground"
            data-test-id="lite-variant-price-calc-preview-gross"
          >
            Precio con IVA {IVA_LABEL}:{" "}
            <span className="font-medium text-foreground">
              ${grossSuggested.toLocaleString("es-CL")}
            </span>
          </p>
        </div>
      </div>
    </Dialog>
  );
}
