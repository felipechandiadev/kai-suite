"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Dialog, Select, Switch, TextField } from "@kai/ui";
import type { SelectOption } from "@kai/ui";
import type { PriceListListItem } from "../types/price-list.types";
import type { TaxListItem } from "../types/tax.types";
import {
  effectiveIvaFactor,
  grossToNet,
  netToGross,
  roundMoneyInt,
} from "../lib/price-tax-math";
import type { VariantPriceRowDraft } from "../lib/variant-price-row";
import { newRowKey } from "../lib/variant-price-row";

type Props = {
  open: boolean;
  mode: "edit" | "add";
  title: string;
  priceListOptions: PriceListListItem[];
  initialRow: VariantPriceRowDraft | null;
  ivaTaxes: TaxListItem[];
  defaultIvaTaxIds: string[];
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (row: VariantPriceRowDraft) => void;
};

export function VariantPriceRowDialog({
  open,
  mode,
  title,
  priceListOptions,
  initialRow,
  ivaTaxes,
  defaultIvaTaxIds,
  saving = false,
  error,
  onClose,
  onSave,
}: Props) {
  const [row, setRow] = useState<VariantPriceRowDraft | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialRow) {
      setRow({ ...initialRow });
      return;
    }
    const first = priceListOptions[0];
    setRow({
      key: newRowKey(),
      priceListId: first?.id ?? "",
      net: 0,
      gross: 0,
      taxIds: [...defaultIvaTaxIds],
      maxDiscountPercent: null,
      minPrice: null,
      lastEdited: "net",
    });
  }, [open, initialRow, priceListOptions, defaultIvaTaxIds]);

  const listSelectOptions: SelectOption[] = useMemo(
    () => priceListOptions.map((p) => ({ id: p.id, label: p.name })),
    [priceListOptions],
  );

  const setNetAndGross = (net: number) => {
    if (!row) {
      return;
    }
    const n = roundMoneyInt(net);
    const f = effectiveIvaFactor(ivaTaxes, row.taxIds);
    setRow({ ...row, net: n, gross: netToGross(n, f), lastEdited: "net" });
  };

  const setGrossAndNet = (gross: number) => {
    if (!row) {
      return;
    }
    const g = roundMoneyInt(gross);
    const f = effectiveIvaFactor(ivaTaxes, row.taxIds);
    setRow({ ...row, gross: g, net: grossToNet(g, f), lastEdited: "gross" });
  };

  const toggleTax = (taxId: string, on: boolean) => {
    if (!row) {
      return;
    }
    const nextIds = on
      ? Array.from(new Set([...row.taxIds, taxId]))
      : row.taxIds.filter((id) => id !== taxId);
    const f = effectiveIvaFactor(ivaTaxes, nextIds);
    if (row.lastEdited === "gross") {
      setRow({ ...row, taxIds: nextIds, net: grossToNet(row.gross, f) });
    } else {
      setRow({ ...row, taxIds: nextIds, gross: netToGross(row.net, f) });
    }
  };

  const handleSave = () => {
    if (!row?.priceListId?.trim()) {
      return;
    }
    onSave(row);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      scroll="paper"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={
        <>
          <Button variant="outlined" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" type="button" onClick={handleSave} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      {!row ? null : (
        <div className="flex flex-col gap-3">
          {mode === "add" ? (
            <Select
              label="Lista de precios"
              name="price-row-list"
              options={listSelectOptions}
              value={row.priceListId || null}
              onChange={(v) =>
                setRow({ ...row, priceListId: v != null ? String(v) : "" })
              }
              placeholder="Seleccionar lista"
              required
            />
          ) : (
            <p className="text-sm font-medium text-foreground">
              {priceListOptions.find((p) => p.id === row.priceListId)?.name ?? "Lista"}
            </p>
          )}
          <TextField
            type="currency"
            currencySymbol="$"
            allowDecimalComma={false}
            label="Precio neto (CLP)"
            name="price-row-net"
            value={String(row.net)}
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
            name="price-row-gross"
            value={String(row.gross)}
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
                    label={`${t.name}${t.rate != null ? ` (${Number(t.rate)}%)` : ""}`}
                    labelPosition="right"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
