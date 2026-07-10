"use client";

import { useMemo } from "react";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { Switch } from "@kai/ui";
import { isJewelryModuleEnabled } from "@/config/jewelry-module.config";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { ProductPriceListItemRow } from "@/features/inventory-products/types/product-grid.types";
import { formatSaleTaxLabel } from "@/features/inventory-products/lib/sale-taxes";
import {
  forcesNetEqualsGross,
  type VariantTaxCategory,
} from "@/features/inventory-products/types/variant-fiscal.types";
import {
  grossToNet,
  netToGross,
  resolvePricingGrossFactor,
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
 * @param defaultTaxIds Impuestos marcados por defecto en catálogo.
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
  masterTaxIds: string[],
): VariantPriceRowModel[] {
  if (items.length === 0) {
    return [createVariantPriceRow(masterTaxIds, null)];
  }
  return items.map((p) => ({
    key:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    priceListId: p.priceListId,
    net: roundMoneyInt(p.netPrice),
    gross: roundMoneyInt(p.grossPrice),
    taxIds: masterTaxIds.length > 0 ? [...masterTaxIds] : [],
    lastEdited: "net" as const,
  }));
}

type VariantPriceRowsEditorProps = {
  priceLists: PriceListListItem[];
  catalogTaxes: TaxListItem[];
  taxCategory: VariantTaxCategory;
  /** Impuestos maestros de la variante (tab SII); solo lectura salvo `taxesEditable`. */
  variantTaxIds: readonly string[];
  rows: VariantPriceRowModel[];
  onRowsChange: (rows: VariantPriceRowModel[]) => void;
  defaultIvaTaxIds: string[];
  /** Diálogos de alta/edición: permite toggles por fila. Detalle variante: false. */
  taxesEditable?: boolean;
  onOpenPmpCalculator: (rowKey: string) => void;
  onOpenJewelryCalculator?: (rowKey: string) => void;
};

export function VariantPriceRowsEditor({
  priceLists,
  catalogTaxes,
  taxCategory,
  variantTaxIds,
  rows,
  onRowsChange,
  defaultIvaTaxIds,
  taxesEditable = false,
  onOpenPmpCalculator,
  onOpenJewelryCalculator,
}: VariantPriceRowsEditorProps) {
  const activeLists = useMemo(
    () => priceLists.filter((p) => p.isActive),
    [priceLists],
  );

  const netEqualsGross = forcesNetEqualsGross(taxCategory);

  const effectiveTaxIds =
    variantTaxIds.length > 0 ? [...variantTaxIds] : netEqualsGross ? [] : [...defaultIvaTaxIds];

  const appliedTaxLabels = useMemo(() => {
    const idSet = new Set(effectiveTaxIds);
    return catalogTaxes
      .filter((t) => idSet.has(t.id))
      .map((t) => formatSaleTaxLabel(t));
  }, [catalogTaxes, effectiveTaxIds]);


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
    onRowsChange(
      rows.map((r) => {
        if (r.key !== key) {
          return taxesEditable ? r : { ...r, taxIds: [...effectiveTaxIds] };
        }
        const next = { ...r, ...patch };
        if (!taxesEditable) {
          next.taxIds = [...effectiveTaxIds];
        }
        return next;
      }),
    );
  };

  const toggleTax = (row: VariantPriceRowModel, taxId: string, on: boolean) => {
    const nextIds = on
      ? Array.from(new Set([...row.taxIds, taxId]))
      : row.taxIds.filter((id) => id !== taxId);
    const f = resolvePricingGrossFactor(taxCategory, catalogTaxes, nextIds);
    if (row.lastEdited === "gross") {
      replaceRow(row.key, {
        taxIds: nextIds,
        net: grossToNet(row.gross, f),
        gross: row.gross,
      });
    } else {
      replaceRow(row.key, {
        taxIds: nextIds,
        net: row.net,
        gross: netToGross(row.net, f),
      });
    }
  };

  const factorForRow = (row: VariantPriceRowModel) =>
    resolvePricingGrossFactor(
      taxCategory,
      catalogTaxes,
      taxesEditable ? row.taxIds : effectiveTaxIds,
    );

  const setNetAndGross = (row: VariantPriceRowModel, net: number) => {
    const n = roundMoneyInt(net);
    const f = factorForRow(row);
    const g = netEqualsGross ? n : netToGross(n, f);
    replaceRow(row.key, {
      net: n,
      gross: g,
      lastEdited: "net",
    });
  };

  const setGrossAndNet = (row: VariantPriceRowModel, gross: number) => {
    const g = roundMoneyInt(gross);
    const f = factorForRow(row);
    const n = netEqualsGross ? g : grossToNet(g, f);
    replaceRow(row.key, {
      gross: g,
      net: n,
      lastEdited: "gross",
    });
  };

  const addRow = () => {
    const seedIds = taxesEditable ? [...defaultIvaTaxIds] : [...effectiveTaxIds];
    onRowsChange([...rows, createVariantPriceRow(seedIds, null)]);
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
          Pulse el botón + para vincular al menos una lista de precios (obligatorio). Defina neto y
          precio con impuestos por fila. Los impuestos se configuran en la pestaña SII.
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
                      label={netEqualsGross ? "Precio de venta (CLP)" : "Precio neto (CLP)"}
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
                      label={netEqualsGross ? "Precio de venta (confirmación)" : "Precio con impuestos (CLP)"}
                      name={`pv-gross-${row.key}`}
                      value={String(row.gross)}
                      placeholder="$ 0"
                      readOnly={netEqualsGross}
                      onChange={(e) => {
                        if (netEqualsGross) {
                          return;
                        }
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
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {taxesEditable ? "Impuestos en esta fila" : "Impuestos en venta (configuración SII)"}
                    </p>
                    {taxesEditable && catalogTaxes.length > 0 ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {catalogTaxes.map((t) => (
                          <Switch
                            key={`${row.key}-${t.id}`}
                            checked={row.taxIds.includes(t.id)}
                            onChange={(on) => toggleTax(row, t.id, on)}
                            label={formatSaleTaxLabel(t)}
                            labelPosition="right"
                            data-test-id={`variant-price-tax-${row.key}-${t.id}`}
                          />
                        ))}
                      </div>
                    ) : netEqualsGross ? (
                      <p className="text-xs text-muted-foreground">
                        Sin impuestos locales en venta (configuración SII). Neto = precio con impuestos.
                      </p>
                    ) : appliedTaxLabels.length > 0 ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {appliedTaxLabels.map((label) => (
                          <li
                            key={label}
                            className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                          >
                            {label}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sin impuestos asignados. Configúrelos en la pestaña SII.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
