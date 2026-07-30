"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useMemo, useState } from "react";
import { TextField } from "@kai/ui";
import { AutoComplete } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { CreatePromotionInput, PromotionScopes } from "@/features/promotions/types/promotion.types";
import { digitsFromClp, parseClpDigitsNullableFromValue } from "./promotion-editor-currency";
import { loadPromotionScopeOptionsAction } from "@/features/promotions/actions/promotion-scope-options.action";
import type { ProductGridRow } from "@/features/inventory-products/types/product-grid.types";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import {
  COMPANY_PAYMENT_METHOD_LABELS,
  type CompanyPaymentMethodConfig,
  type CompanyPaymentMethodId,
} from "@/features/companies/types/company-payment-methods.types";
import {
  buildAllBranchesExplicitScopes,
  isLocationUnrestricted,
  locationRowsToScopes,
  scopesToLocationRows,
  type LocationRow,
} from "./promotion-eligibility-scope";
import { PromotionProductSearchField } from "./PromotionProductSearchField";

type Props = {
  input: CreatePromotionInput;
  patch: <K extends keyof CreatePromotionInput>(
    key: K,
    value: CreatePromotionInput[K],
  ) => void;
};

const CATALOG_MODE = {
  PRODUCT: "product",
  CATEGORY: "category",
} as const;

const ALL_CATEGORIES_ID = "__ALL_CATEGORIES__";
const ALL_PAYMENTS_ID = "__ALL_PAYMENTS__";

type CatalogMode = (typeof CATALOG_MODE)[keyof typeof CATALOG_MODE];

type CategoryOption =
  | (CategoryListItem & { kind?: undefined })
  | { id: typeof ALL_CATEGORIES_ID; name: string; kind: "all" };

const ALL_CATEGORIES_OPTION: CategoryOption = {
  id: ALL_CATEGORIES_ID,
  name: "Todas las categorías",
  kind: "all",
};

function mergeScopes(input: CreatePromotionInput): PromotionScopes {
  const s = input.scopes;
  return {
    branches: s?.branches ?? [],
    pointsOfSale: s?.pointsOfSale ?? [],
    products: s?.products ?? [],
    variants: s?.variants ?? [],
    categories: s?.categories ?? [],
    customers: s?.customers ?? [],
    paymentMethods: s?.paymentMethods ?? [],
  };
}

function paymentMethodLabel(m: CompanyPaymentMethodConfig): string {
  const base = COMPANY_PAYMENT_METHOD_LABELS[m.method as CompanyPaymentMethodId] ?? m.method;
  const alias = m.alias?.trim();
  return alias ? `${base} (${alias})` : base;
}

export function PromotionStepEligibility({ input, patch }: Props) {
  const scopes = useMemo(() => mergeScopes(input), [input.scopes]);

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSaleListItem[]>([]);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<CompanyPaymentMethodConfig[]>([]);

  const [catalogMode, setCatalogMode] = useState<CatalogMode>(() =>
    mergeScopes(input).products.some((p) => p.mode === "INCLUDE")
      ? CATALOG_MODE.PRODUCT
      : CATALOG_MODE.CATEGORY,
  );

  const selectedProductId = scopes.products.find((p) => p.mode === "INCLUDE")?.productId ?? null;

  const categoryIncludes = scopes.categories.filter((c) => c.mode === "INCLUDE");

  const selectedCategoryOption: CategoryOption | null = useMemo(() => {
    if (categoryIncludes.length === 0) return ALL_CATEGORIES_OPTION;
    const id = categoryIncludes[0]!.categoryId;
    const found = categories.find((c) => c.id === id);
    return found ?? { id, name: `Categoría ${id.slice(0, 8)}…`, productCount: 0, childCount: 0 };
  }, [categoryIncludes, categories]);

  const paymentInclude = scopes.paymentMethods.find((p) => p.mode === "INCLUDE");
  const paymentSelectValue = useMemo(() => {
    const id = paymentInclude?.companyPaymentMethodId ?? ALL_PAYMENTS_ID;
    if (id === ALL_PAYMENTS_ID) return id;
    return paymentMethods.some((m) => m.id === id) ? id : ALL_PAYMENTS_ID;
  }, [paymentInclude, paymentMethods]);

  const locationUnrestricted = isLocationUnrestricted(scopes);
  const locationRows = useMemo(
    () => scopesToLocationRows(scopes, branches, pointsOfSale),
    [scopes, branches, pointsOfSale],
  );

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    void (async () => {
      const data = await loadPromotionScopeOptionsAction();
      if (cancelled) return;
      setBranches(data.branches);
      setPointsOfSale(data.pointsOfSale);
      setCategories(data.categories);
      setPaymentMethods(data.paymentMethods);
      setOptionsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (scopes.products.some((p) => p.mode === "INCLUDE")) {
      setCatalogMode(CATALOG_MODE.PRODUCT);
    }
  }, [scopes.products]);

  const patchScopes = useCallback(
    (partial: Partial<PromotionScopes>) => {
      const next: PromotionScopes = { ...mergeScopes(input), ...partial };
      patch("scopes", next);
    },
    [input, patch],
  );

  const onCatalogModeSelect = useCallback(
    (id: string | number | null) => {
      const v = id === CATALOG_MODE.PRODUCT ? CATALOG_MODE.PRODUCT : CATALOG_MODE.CATEGORY;
      setCatalogMode(v);
      if (v === CATALOG_MODE.PRODUCT) {
        patchScopes({ categories: [] });
      } else {
        patchScopes({ products: [] });
      }
    },
    [patchScopes],
  );

  const onProductPick = useCallback(
    (row: ProductGridRow | null) => {
      if (!row) {
        patchScopes({ products: [] });
        return;
      }
      patchScopes({
        products: [{ productId: row.id, mode: "INCLUDE" }],
        categories: [],
      });
    },
    [patchScopes],
  );

  const categoryAutocompleteOptions = useMemo((): CategoryOption[] => {
    const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
    return [ALL_CATEGORIES_OPTION, ...sorted];
  }, [categories]);

  const onCategoryPick = useCallback(
    (opt: CategoryOption | null) => {
      if (!opt || opt.id === ALL_CATEGORIES_ID) {
        patchScopes({ categories: [], products: [] });
        return;
      }
      if ("kind" in opt && opt.kind === "all") {
        patchScopes({ categories: [], products: [] });
        return;
      }
      patchScopes({
        categories: [{ categoryId: opt.id, mode: "INCLUDE" }],
        products: [],
      });
    },
    [patchScopes],
  );

  const onPaymentSelect = useCallback(
    (id: string | number | null) => {
      if (id == null || String(id) === ALL_PAYMENTS_ID) {
        patchScopes({ paymentMethods: [] });
        return;
      }
      patchScopes({
        paymentMethods: [{ companyPaymentMethodId: String(id), mode: "INCLUDE" }],
      });
    },
    [patchScopes],
  );

  const onAllBranchesSwitch = useCallback(
    (unrestricted: boolean) => {
      if (!unrestricted && branches.length === 0) {
        return;
      }
      if (unrestricted) {
        patchScopes({ branches: [], pointsOfSale: [] });
        return;
      }
      patchScopes(buildAllBranchesExplicitScopes(branches));
    },
    [branches, patchScopes],
  );

  const applyLocationRows = useCallback(
    (nextRows: LocationRow[]) => {
      patchScopes(locationRowsToScopes(nextRows));
    },
    [patchScopes],
  );

  const onBranchSwitch = useCallback(
    (branchId: string, on: boolean) => {
      const onCount = locationRows.filter((r) => r.branchOn).length;
      if (!on && onCount <= 1) {
        return;
      }
      const next = locationRows.map((r) => {
        if (r.branch.id !== branchId) return r;
        if (!on) {
          const posOn: Record<string, boolean> = { ...r.posOn };
          for (const p of r.posInBranch) posOn[p.id] = false;
          return { ...r, branchOn: false, posOn };
        }
        const posOn: Record<string, boolean> = {};
        for (const p of r.posInBranch) posOn[p.id] = true;
        return { ...r, branchOn: true, posOn };
      });
      applyLocationRows(next);
    },
    [applyLocationRows, locationRows],
  );

  const onPosSwitch = useCallback(
    (branchId: string, posId: string, on: boolean) => {
      const next = locationRows.map((r) => {
        if (r.branch.id !== branchId) return r;
        if (!r.branchOn) return r;
        const posOn = { ...r.posOn, [posId]: on };
        if (!on) {
          const anyOn = r.posInBranch.some((p) => (p.id === posId ? false : posOn[p.id]));
          if (!anyOn && r.posInBranch.length > 0) {
            const posOff: Record<string, boolean> = { ...posOn };
            for (const p of r.posInBranch) posOff[p.id] = false;
            return { ...r, branchOn: false, posOn: posOff };
          }
        }
        return { ...r, posOn };
      });
      applyLocationRows(next);
    },
    [applyLocationRows, locationRows],
  );

  const paymentSelectOptions = useMemo(() => {
    const opts = [{ id: ALL_PAYMENTS_ID, label: "Todos los medios de pago" }];
    for (const m of paymentMethods) {
      opts.push({ id: m.id, label: paymentMethodLabel(m) });
    }
    return opts;
  }, [paymentMethods]);

  return (
    <div className="flex flex-col gap-5" data-test-id="promotion-step-eligibility">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Subtotal mínimo del carrito"
          type="currency"
          value={digitsFromClp(input.minSubtotal)}
          onChange={(e) => patch("minSubtotal", parseClpDigitsNullableFromValue(e.target.value))}
          currencySymbol="$"
          data-test-id="promotion-field-min-subtotal"
        />
        <TextField
          label="Cantidad mínima de unidades"
          type="number"
          value={input.minQuantity == null ? "" : String(input.minQuantity)}
          onChange={(e) => {
            const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
            patch("minQuantity", raw === "" ? null : Number(raw));
          }}
          data-test-id="promotion-field-min-qty"
        />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Alcance</h3>
        <p className="text-xs text-muted-foreground">
          Restringe dónde y con qué condiciones de catálogo y cobro aplica la promoción. Deja en
          «todos» cuando no quieras filtrar esa dimensión.
        </p>
      </div>

      {optionsLoading ? (
        <LoadingState className="flex items-center justify-center py-4" label="Cargando catálogos de alcance" />
      ) : null}

      <div className="rounded-xl border border-border bg-muted/15 p-4 shadow-sm">
        <p className="text-sm font-medium text-foreground">Producto o categoría</p>
        <div className="mt-3 max-w-md">
          <Select
            label="Tipo de alcance de catálogo"
            alwaysShowLabel
            options={[
              { id: CATALOG_MODE.PRODUCT, label: "Por producto" },
              { id: CATALOG_MODE.CATEGORY, label: "Por categoría" },
            ]}
            value={catalogMode}
            onChange={onCatalogModeSelect}
            data-test-id="promotion-scope-catalog-mode"
          />
        </div>

        {catalogMode === CATALOG_MODE.PRODUCT ? (
          <div className="mt-3 max-w-xl">
            <PromotionProductSearchField
              selectedProductId={selectedProductId}
              onPickProduct={onProductPick}
              disabled={optionsLoading}
            />
          </div>
        ) : (
          <div className="mt-3 max-w-xl">
            <AutoComplete<CategoryOption>
              label="Categoría"
              placeholder="Buscar categoría…"
              options={categoryAutocompleteOptions}
              value={selectedCategoryOption}
              onChange={onCategoryPick}
              getOptionLabel={(o) => o.name}
              getOptionValue={(o) => o.id}
              alwaysShowLabel
              data-test-id="promotion-scope-category-autocomplete"
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/15 p-4 shadow-sm">
        <p className="text-sm font-medium text-foreground">Medio de pago</p>
        <div className="mt-3 max-w-md">
          <Select
            label="Medios de pago"
            alwaysShowLabel
            options={paymentSelectOptions}
            value={paymentSelectValue}
            onChange={onPaymentSelect}
            disabled={paymentMethods.length === 0}
            data-test-id="promotion-scope-payment-select"
          />
        </div>
        {paymentMethods.length === 0 ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            No hay medios de pago configurados para la empresa activa. Configúralos en ajustes de
            empresa.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-muted/15 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-foreground">Sucursales y puntos de venta</p>
          <Switch
            label="Todas las sucursales"
            labelPosition="left"
            checked={locationUnrestricted}
            onChange={onAllBranchesSwitch}
            disabled={optionsLoading}
            data-test-id="promotion-scope-all-branches-switch"
          />
        </div>

        {!locationUnrestricted && branches.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3">
            {locationRows.map((row) => (
              <div
                key={row.branch.id}
                className="rounded-lg border border-border bg-background p-3 shadow-sm"
                data-test-id={`promotion-scope-branch-card-${row.branch.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                  <p className="text-sm font-medium text-foreground">{row.branch.name}</p>
                  <Switch
                    label={row.branchOn ? "Sucursal activa" : "Sucursal desactivada"}
                    labelPosition="left"
                    checked={row.branchOn}
                    onChange={(on) => onBranchSwitch(row.branch.id, on)}
                    data-test-id={`promotion-scope-branch-switch-${row.branch.id}`}
                  />
                </div>
                {row.posInBranch.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No hay puntos de venta asociados a esta sucursal.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {row.posInBranch.map((pos) => (
                      <li
                        key={pos.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1.5"
                      >
                        <span className="text-sm text-foreground">{pos.name}</span>
                        <Switch
                          label={row.posOn[pos.id] ? "Activo" : "Inactivo"}
                          labelPosition="left"
                          checked={!!row.posOn[pos.id]}
                          disabled={!row.branchOn}
                          onChange={(on) => onPosSwitch(row.branch.id, pos.id, on)}
                          data-test-id={`promotion-scope-pos-switch-${pos.id}`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {!locationUnrestricted && branches.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No hay sucursales cargadas. Crea sucursales en ajustes para acotar por ubicación.
          </p>
        ) : null}
      </div>
    </div>
  );
}
