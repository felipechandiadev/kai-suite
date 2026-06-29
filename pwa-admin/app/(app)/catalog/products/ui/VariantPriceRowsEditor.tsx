"use client";

import { useMemo } from "react";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select, type Option } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch/Switch";
import IconButton from "@/shared/components/IconButton/IconButton";
import { isJewelryModuleEnabled } from "@/config/jewelry-module.config";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { ProductPriceListItemRow } from "@/features/inventory-products/types/product-grid.types";
import {
  effectiveIvaFactor,
  grossToNet,
  netToGross,
  roundMoneyInt,
} from "@/features/inventory-products/domain/price-tax-math";

export type VariantPriceRowModel = {
  key: string;
  priceListId: string | null;
  net: number;
  gross: number;
  taxIds: string[];
  lastEdited: "net" | "gross";
};

/**
 * @param defaultTaxIds Impuestos IVA marcados por defecto en catálogo.
 * @param defaultPriceListId Lista de precios activa marcada como predeterminada (u omitir).
 */
export function createVariantPriceRow(
  defaultTaxIds: string[] = [],
  defaultPriceListId?: string | null,
): VariantPriceRowModel {
  const listId =
    typeof defaultPriceListId === "string" && defaultPriceListId.trim().length > 0
      ? defaultPriceListId.trim()
      : null;
  return {
    key:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    priceListId: listId,
    net: 0,
    gross: 0,
    taxIds: [...defaultTaxIds],
    lastEdited: "net",
  };
}

/** Construye filas del editor a partir de los precios ya guardados en una variante (p. ej. grilla). */
export function priceListItemsToVariantRows(
  items: ProductPriceListItemRow[],
  defaultIvaTaxIds: string[],
): VariantPriceRowModel[] {
  if (items.length === 0) {
    return [createVariantPriceRow(defaultIvaTaxIds, null)];
  }
  return items.map((p) => ({
    key:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    priceListId: p.priceListId,
    net: roundMoneyInt(p.netPrice),
    gross: roundMoneyInt(p.grossPrice),
    taxIds: Array.isArray(p.taxIds) && p.taxIds.length > 0 ? [...p.taxIds] : [...defaultIvaTaxIds],
    lastEdited: "net" as const,
  }));
}

type VariantPriceRowsEditorProps = {
  priceLists: PriceListListItem[];
  ivaTaxes: TaxListItem[];
  rows: VariantPriceRowModel[];
  onRowsChange: (rows: VariantPriceRowModel[]) => void;
  defaultIvaTaxIds: string[];
  /** Abre la calculadora PMP/utilidad para la fila indicada (precio neto e impuestos de esa fila). */
  onOpenPmpCalculator: (rowKey: string) => void;
  /** Abre la calculadora de precio por metal (joyería) para la fila indicada. */
  onOpenJewelryCalculator?: (rowKey: string) => void;
};

export function VariantPriceRowsEditor({
  priceLists,
  ivaTaxes,
  rows,
  onRowsChange,
  defaultIvaTaxIds,
  onOpenPmpCalculator,
  onOpenJewelryCalculator,
}: VariantPriceRowsEditorProps) {
  const activeLists = useMemo(
    () => priceLists.filter((p) => p.isActive),
    [priceLists],
  );

  const listIdsTakenByOtherRows = (rowKey: string) => {
    const s = new Set<string>();
    for (const r of rows) {
      if (r.key !== rowKey && r.priceListId) {
        s.add(r.priceListId);
      }
    }
    return s;
  };

  const replaceRow = (key: string, patch: Partial<VariantPriceRowModel>) => {
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const factorForRow = (row: VariantPriceRowModel) =>
    effectiveIvaFactor(ivaTaxes, row.taxIds);

  const setNetAndGross = (row: VariantPriceRowModel, net: number) => {
    const n = roundMoneyInt(net);
    const f = factorForRow(row);
    replaceRow(row.key, {
      net: n,
      gross: netToGross(n, f),
      lastEdited: "net",
    });
  };

  const setGrossAndNet = (row: VariantPriceRowModel, gross: number) => {
    const g = roundMoneyInt(gross);
    const f = factorForRow(row);
    replaceRow(row.key, {
      gross: g,
      net: grossToNet(g, f),
      lastEdited: "gross",
    });
  };

  const toggleTax = (row: VariantPriceRowModel, taxId: string, on: boolean) => {
    const nextIds = on
      ? Array.from(new Set([...row.taxIds, taxId]))
      : row.taxIds.filter((id) => id !== taxId);
    const nextRow = { ...row, taxIds: nextIds };
    const f = effectiveIvaFactor(ivaTaxes, nextIds);
    if (nextRow.lastEdited === "gross") {
      replaceRow(row.key, {
        taxIds: nextIds,
        net: grossToNet(nextRow.gross, f),
        gross: nextRow.gross,
      });
    } else {
      replaceRow(row.key, {
        taxIds: nextIds,
        net: nextRow.net,
        gross: netToGross(nextRow.net, f),
      });
    }
  };

  const addRow = () => {
    onRowsChange([...rows, createVariantPriceRow(defaultIvaTaxIds, null)]);
  };

  const removeRow = (key: string) => {
    if (rows.length <= 1) {
      return;
    }
    onRowsChange(rows.filter((r) => r.key !== key));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <IconButton
          type="button"
          icon="Plus"
          ariaLabel="Agregar precio"
          variant="action"
          size="sm"
          onClick={addRow}
          data-test-id="variant-price-add-row"
        />
        <p className="text-sm font-medium text-foreground">Precios por lista</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Pulse el botón + para vincular al menos una lista de precios (obligatorio). Defina neto, precio con impuestos e
          IVA por fila.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => {
            const taken = listIdsTakenByOtherRows(row.key);
            const listOptions: Option[] = activeLists
              .filter((p) => !taken.has(p.id) || p.id === row.priceListId)
              .map((p) => ({
                id: p.id,
                label: p.name,
              }));

            return (
              <div
                key={row.key}
                className="relative rounded-lg border border-border bg-muted/20 p-3 pb-12 pr-12 pt-3 shadow-sm"
                data-test-id={`variant-price-row-${row.key}`}
              >
                <div className="absolute right-2 top-2 z-10">
                  <IconButton
                    type="button"
                    icon="Trash2"
                    ariaLabel="Eliminar fila"
                    variant="action"
                    size="sm"
                    disabled={rows.length <= 1}
                    onClick={() => removeRow(row.key)}
                    data-test-id={`variant-price-remove-${row.key}`}
                  />
                </div>
                <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1">
                  {onOpenJewelryCalculator && isJewelryModuleEnabled() ? (
                    <IconButton
                      type="button"
                      icon="Gem"
                      ariaLabel="Calculadora de precio por metal (joyería)"
                      variant="action"
                      size="sm"
                      onClick={() => onOpenJewelryCalculator(row.key)}
                      data-test-id={`variant-jewelry-calculator-open-${row.key}`}
                    />
                  ) : null}
                  <IconButton
                    type="button"
                    icon="Calculator"
                    ariaLabel="Calculadora PMP y utilidad"
                    variant="action"
                    size="sm"
                    onClick={() => onOpenPmpCalculator(row.key)}
                    data-test-id={`variant-pmp-calculator-open-${row.key}`}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="min-w-0">
                    <Select
                      label="Lista de precios"
                      name={`pv-pl-${row.key}`}
                      options={listOptions}
                      value={row.priceListId}
                      onChange={(v) =>
                        replaceRow(row.key, {
                          priceListId: v != null ? String(v) : null,
                        })
                      }
                      placeholder="Seleccionar lista"
                      required
                      data-test-id={`variant-price-list-${row.key}`}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextField
                      type="currency"
                      currencySymbol="$"
                      allowDecimalComma={false}
                      label="Precio neto (CLP)"
                      name={`pv-net-${row.key}`}
                      value={String(row.net)}
                      placeholder="$ 0"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        if (raw === "") {
                          setNetAndGross(row, 0);
                          return;
                        }
                        const v = Number.parseInt(raw, 10);
                        if (!Number.isFinite(v) || v < 0) {
                          return;
                        }
                        setNetAndGross(row, v);
                      }}
                      data-test-id={`variant-price-net-${row.key}`}
                    />
                    <TextField
                      type="currency"
                      currencySymbol="$"
                      allowDecimalComma={false}
                      label="Precio con impuestos (CLP)"
                      name={`pv-gross-${row.key}`}
                      value={String(row.gross)}
                      placeholder="$ 0"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        if (raw === "") {
                          setGrossAndNet(row, 0);
                          return;
                        }
                        const v = Number.parseInt(raw, 10);
                        if (!Number.isFinite(v) || v < 0) {
                          return;
                        }
                        setGrossAndNet(row, v);
                      }}
                      data-test-id={`variant-price-gross-${row.key}`}
                    />
                  </div>
                  {ivaTaxes.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">Impuestos (IVA) en esta fila</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {ivaTaxes.map((t) => (
                          <Switch
                            key={`${row.key}-${t.id}`}
                            checked={row.taxIds.includes(t.id)}
                            onChange={(on) => toggleTax(row, t.id, on)}
                            label={`${t.name}${t.rate != null ? ` (${Number(t.rate)}%)` : ""}`}
                            labelPosition="right"
                            data-test-id={`variant-price-tax-${row.key}-${t.id}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
