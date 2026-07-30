"use client";

import { Switch, TextField } from "@kai/ui";
import type { TaxListItem } from "../types/tax.types";
import {
  effectiveIvaFactor,
  grossToNet,
  minPriceFromMaxDiscount,
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
    const maxD = row.maxDiscountPercent;
    onChange({
      ...row,
      net: n,
      gross: netToGross(n, f),
      lastEdited: "net",
      minPrice: maxD != null && maxD > 0 ? minPriceFromMaxDiscount(n, maxD) : row.minPrice,
    });
  };

  const setGrossAndNet = (gross: number) => {
    const g = roundMoneyInt(gross);
    const f = effectiveIvaFactor(ivaTaxes, row.taxIds);
    const n = grossToNet(g, f);
    const maxD = row.maxDiscountPercent;
    onChange({
      ...row,
      gross: g,
      net: n,
      lastEdited: "gross",
      minPrice: maxD != null && maxD > 0 ? minPriceFromMaxDiscount(n, maxD) : row.minPrice,
    });
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
      <TextField
        label="Máximo descuento autorizado"
        name={`price-max-discount-${row.priceListId}`}
        value={row.maxDiscountPercent != null ? String(row.maxDiscountPercent) : ""}
        placeholder="Máximo descuento autorizado"
        disabled={disabled}
        onChange={(e) => {
          const t = e.target.value.trim().replace(",", ".");
          if (t === "") {
            onChange({ ...row, maxDiscountPercent: null, minPrice: null });
            return;
          }
          const n = Number(t);
          if (!Number.isFinite(n) || n < 0) {
            return;
          }
          const clamped = Math.min(99.99, n);
          onChange({
            ...row,
            maxDiscountPercent: clamped,
            minPrice: clamped > 0 ? minPriceFromMaxDiscount(row.net, clamped) : null,
          });
        }}
      />
      <TextField
        type="currency"
        currencySymbol="$"
        allowDecimalComma={false}
        label="Precio mínimo (neto)"
        name={`price-min-${row.priceListId}`}
        value={row.minPrice != null ? String(row.minPrice) : ""}
        placeholder="$ 0"
        readOnly
        disabled={disabled}
        title="Derivado del máximo descuento autorizado"
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
