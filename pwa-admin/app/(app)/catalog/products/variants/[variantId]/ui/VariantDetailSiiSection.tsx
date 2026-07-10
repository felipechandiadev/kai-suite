"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/shared/components/Alert/Alert";
import IconButton from "@/shared/components/IconButton/IconButton";
import Select from "@/shared/components/Select/Select";
import Switch from "@/shared/components/Switch/Switch";
import { fetchTaxesForPage } from "@/features/accounting-taxes/lib/fetch-taxes-for-page";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { updateProductVariantFiscalPartialAction } from "@/features/inventory-products/actions/product.action";
import {
  catalogDefaultIvaTaxIds,
  filterSelectableSaleTaxes,
  formatSaleTaxLabel,
  resolveVariantTaxIds,
} from "@/features/inventory-products/lib/sale-taxes";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import {
  allowsSaleTaxIds,
  DEFAULT_VARIANT_TAX_CATEGORY,
  forcesNetEqualsGross,
  isOutOfFiscalScope,
  VARIANT_TAX_CATEGORY_OPTIONS,
  variantBoletaLineKind,
  variantHasLocalIva,
  variantTaxCategoryDescription,
  type VariantTaxCategory,
} from "@/features/inventory-products/types/variant-fiscal.types";

function sectionCardClass(editing: boolean): string {
  return `relative space-y-4 rounded-lg border border-border bg-background p-4 pb-12 ${
    editing ? "ring-1 ring-primary/25" : ""
  }`;
}

function taxIdsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

type Props = {
  variant: ProductVariantGridRow;
};

export function VariantDetailSiiSection({ variant }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [catalogTaxes, setCatalogTaxes] = useState<TaxListItem[]>([]);
  const [taxesLoadError, setTaxesLoadError] = useState<string | null>(null);

  const selectableTaxes = useMemo(
    () => filterSelectableSaleTaxes(catalogTaxes),
    [catalogTaxes],
  );
  const defaultIvaTaxIds = useMemo(
    () => catalogDefaultIvaTaxIds(catalogTaxes),
    [catalogTaxes],
  );

  const readCategory = variant.taxCategory ?? DEFAULT_VARIANT_TAX_CATEGORY;
  const readRequiresDte = variant.requiresDte !== false;
  const readTaxIds = useMemo(
    () => resolveVariantTaxIds(variant, undefined, defaultIvaTaxIds),
    [variant, defaultIvaTaxIds],
  );

  const [taxCategory, setTaxCategory] = useState<VariantTaxCategory>(readCategory);
  const [requiresDte, setRequiresDte] = useState(readRequiresDte);
  const [taxIds, setTaxIds] = useState<string[]>(readTaxIds);

  useEffect(() => {
    let cancelled = false;
    void fetchTaxesForPage()
      .then((rows) => {
        if (!cancelled) {
          setCatalogTaxes(rows);
          setTaxesLoadError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTaxesLoadError("No se pudieron cargar los impuestos del catálogo.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (editing) {
      return;
    }
    setTaxCategory(variant.taxCategory ?? DEFAULT_VARIANT_TAX_CATEGORY);
    setRequiresDte(variant.requiresDte !== false);
    setTaxIds(resolveVariantTaxIds(variant, undefined, defaultIvaTaxIds));
  }, [variant.taxCategory, variant.requiresDte, variant.taxIds, editing, defaultIvaTaxIds, variant]);

  const selectOptions = useMemo(
    () =>
      VARIANT_TAX_CATEGORY_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
      })),
    [],
  );

  const ro = !editing;
  const taxesEditable = allowsSaleTaxIds(taxCategory);
  const displayCategory = taxCategory;
  const displayRequiresDte = requiresDte;
  const activeTaxIds = taxIds;

  const categoryDescription = useMemo(
    () => variantTaxCategoryDescription(taxCategory),
    [taxCategory],
  );

  function hydrateFromVariant() {
    setTaxCategory(variant.taxCategory ?? DEFAULT_VARIANT_TAX_CATEGORY);
    setRequiresDte(variant.requiresDte !== false);
    setTaxIds(resolveVariantTaxIds(variant, undefined, defaultIvaTaxIds));
  }

  function handleCategoryChange(id: string) {
    const next = id as VariantTaxCategory;
    setTaxCategory(next);
    if (isOutOfFiscalScope(next)) {
      setRequiresDte(false);
      setTaxIds([]);
    } else if (!allowsSaleTaxIds(next)) {
      setTaxIds([]);
    }
  }

  function toggleTax(taxId: string, on: boolean) {
    setTaxIds((prev) => {
      if (on) {
        return Array.from(new Set([...prev, taxId]));
      }
      return prev.filter((id) => id !== taxId);
    });
  }

  function toggleEditOrSave() {
    setError(null);
    if (!editing) {
      hydrateFromVariant();
      setEditing(true);
      return;
    }

    startTransition(() => {
      void (async () => {
        const res = await updateProductVariantFiscalPartialAction(variant.id, {
          taxCategory,
          requiresDte: isOutOfFiscalScope(taxCategory) ? false : requiresDte,
          taxIds: taxesEditable ? taxIds : [],
        });
        if (res.success) {
          setEditing(false);
          await router.refresh();
        } else {
          setError(res.error);
        }
      })();
    });
  }

  return (
    <section className={sectionCardClass(editing)} data-test-id="variant-sii-section">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Configuración tributaria SII</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tratamiento de IVA en venta, impuestos aplicables y obligación de emitir DTE.
        </p>
      </div>

      {error ? (
        <Alert variant="error" data-test-id="variant-sii-error">
          {error}
        </Alert>
      ) : null}

      {taxesLoadError ? (
        <Alert variant="warning">{taxesLoadError}</Alert>
      ) : null}

      <Select
        label="Tratamiento tributario de venta"
        name="variant-sii-tax-category"
        value={taxCategory}
        onChange={(id) => handleCategoryChange(String(id))}
        options={selectOptions}
        required
        disabled={ro}
        data-test-id="variant-sii-tax-category"
      />
      <p className="text-sm text-muted-foreground">{categoryDescription}</p>

      <Switch
        label="Emitir documento tributario (DTE)"
        checked={requiresDte}
        onChange={setRequiresDte}
        disabled={ro || isOutOfFiscalScope(taxCategory)}
        data-test-id="variant-sii-requires-dte"
      />

      <div className="space-y-2 rounded-md border border-border/70 bg-muted/10 p-3">
        <p className="text-sm font-medium text-foreground">Impuestos en venta</p>
        <p className="text-xs text-muted-foreground">
          Desde Contabilidad → Impuestos. Se aplican al calcular el precio con impuestos en la
          pestaña Precios.
        </p>
        {!taxesEditable ? (
          <p className="text-sm text-muted-foreground">
            Con este tratamiento tributario no se aplican impuestos locales en la venta.
          </p>
        ) : selectableTaxes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay impuestos activos. Cree impuestos en Contabilidad → Impuestos.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectableTaxes.map((t) => (
              <Switch
                key={t.id}
                checked={activeTaxIds.includes(t.id)}
                onChange={(on) => toggleTax(t.id, on)}
                label={formatSaleTaxLabel(t)}
                labelPosition="right"
                disabled={ro || !taxesEditable}
                data-test-id={`variant-sii-tax-${t.id}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-sm">
        <p className="font-medium text-foreground">Resumen operativo</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>IVA local en venta: {variantHasLocalIva(displayCategory) ? "Sí" : "No"}</li>
          <li>Línea en boleta (referencia): {variantBoletaLineKind(displayCategory)}</li>
          <li>Emisión DTE: {displayRequiresDte ? "Sí" : "No"}</li>
          {!taxIdsEqual(activeTaxIds, []) && taxesEditable ? (
            <li>
              Tasas combinadas:{" "}
              {selectableTaxes
                .filter((t) => activeTaxIds.includes(t.id))
                .reduce((sum, t) => sum + (Number(t.rate) || 0), 0)
                .toLocaleString("es-CL")}
              %
            </li>
          ) : null}
        </ul>
      </div>

      {forcesNetEqualsGross(displayCategory) ? (
        <Alert variant="warning">
          Verifique que en la pestaña Precios el neto sea igual al precio con impuestos.
        </Alert>
      ) : null}

      <div className="absolute bottom-2 right-2">
        <IconButton
          icon={editing ? "Save" : "Pencil"}
          variant="action"
          size="sm"
          ariaLabel={editing ? "Guardar configuración SII" : "Editar configuración SII"}
          onClick={toggleEditOrSave}
          disabled={pending || Boolean(taxesLoadError)}
          isLoading={pending}
          data-test-id="variant-sii-edit-save"
        />
      </div>
    </section>
  );
}
