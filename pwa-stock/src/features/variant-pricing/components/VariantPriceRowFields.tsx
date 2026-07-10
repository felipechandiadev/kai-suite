"use client";

import { Switch, TextField } from "@kai/ui";
import type { TaxListItem } from "../types/tax.types";
import {
  effectiveIvaFactor,
  grossToNet,
  netToGross,
  roundMoneyInt,
} from "../lib/price-tax-math";
import type { VariantPriceRowDraft } from "../lib/variant-price-row";

type Props = {
  row: VariantPriceRowDraft;
  ivaTaxes: TaxListItem[];
  disabled?: boolean;
  onChange: (row: VariantPriceRowDraft) => void;
};

export function VariantPriceRowFields({ row, ivaTaxes, disabled = false, onChange }: Props) {
  const setNetAndGross = (net: number) => {
    const n = roundMoneyInt(net);
    const f = effectiveIvaFactor(ivaTaxes, row.taxIds);
    onChange({ ...row, net: n, gross: netToGross(n, f), lastEdited: "net" });
  };

  const setGrossAndNet = (gross: number) => {
    const g = roundMoneyInt(gross);
    const f = effectiveIvaFactor(ivaTaxes, row.taxIds);
    onChange({ ...row, gross: g, net: grossToNet(g, f), lastEdited: "gross" });
  };

  const toggleTax = (taxId: string, on: boolean) => {
    const nextIds = on
      ? Array.from(new Set([...row.taxIds, taxId]))
      : row.taxIds.filter((id) => id !== taxId);
    const f = effectiveIvaFactor(ivaTaxes, nextIds);
    if (row.lastEdited === "gross") {
      onChange({ ...row, taxIds: nextIds, net: grossToNet(row.gross, f) });
    } else {
      onChange({ ...row, taxIds: nextIds, gross: netToGross(row.net, f) });
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <TextField
        type="currency"
        currencySymbol="$"
        allowDecimalComma={false}
        label="Precio neto (CLP)"
        name={`price-net-${row.priceListId}`}
        value={String(row.net)}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          if (raw === "") {
            setNetAndGross(0);
            return;
          }
          const v = Number.parseInt(raw, 10);
          if (Number.isFinite(v) && v >= 0) {
            setNetAndGross(v);
          }
        }}
      />
      <TextField
        type="currency"
        currencySymbol="$"
        allowDecimalComma={false}
        label="Precio con impuestos (CLP)"
        name={`price-gross-${row.priceListId}`}
        value={String(row.gross)}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          if (raw === "") {
            setGrossAndNet(0);
            return;
          }
          const v = Number.parseInt(raw, 10);
          if (Number.isFinite(v) && v >= 0) {
            setGrossAndNet(v);
          }
        }}
      />
      {ivaTaxes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Impuestos (IVA)</p>
          <div className="flex flex-col gap-2">
            {ivaTaxes.map((t) => (
              <Switch
                key={t.id}
                checked={row.taxIds.includes(t.id)}
                onChange={(on) => toggleTax(t.id, on)}
                disabled={disabled}
                label={`${t.name}${t.rate != null ? ` (${Number(t.rate)}%)` : ""}`}
                labelPosition="right"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
