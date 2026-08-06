"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { IconButton, TextField } from "@kai/ui";
import type { ManufactureVariantSearchItem } from "@/features/inventory-production/types/production-batch.types";
import { searchManufactureVariantsAction } from "@/features/inventory-production/actions/production-batch.action";
import { productionVariantSearchHelper } from "@/features/inventory-production/lib/production-batch-labels";
import { useCompany } from "@/providers/CompanyProvider";

type Props = {
  productionUnitId: string | null;
  onAddVariant: (item: ManufactureVariantSearchItem) => void;
};

export function ManufactureVariantSearchPanel({
  productionUnitId,
  onAddVariant,
}: Props) {
  const { company } = useCompany();
  const searchHelper = productionVariantSearchHelper(company?.kaiProduct);
  const [draftSearch, setDraftSearch] = useState("");
  const [items, setItems] = useState<ManufactureVariantSearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!productionUnitId) {
      setItems([]);
      return;
    }
    const q = draftSearch.trim();
    let cancelled = false;
    const t = setTimeout(() => {
      setSearching(true);
      void searchManufactureVariantsAction({
        q,
        productionUnitId,
      }).then((rows) => {
        if (!cancelled) {
          setItems(rows);
          setSearching(false);
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draftSearch, productionUnitId]);

  return (
    <aside
      className="flex min-h-0 w-full min-w-0 flex-1 shrink-0 flex-col gap-3 rounded-xl border border-border bg-background p-3 lg:h-[calc(100vh-8rem)] lg:max-w-sm lg:flex-none lg:basis-[22rem]"
      data-test-id="manufacture-variant-search-panel"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Buscar variantes
      </p>
      <TextField
        label="Buscar"
        name="manufacture-variant-search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        placeholder={
          productionUnitId
            ? "Nombre o SKU…"
            : "Seleccione unidad de producción"
        }
        disabled={!productionUnitId}
        alwaysShowLabel
        startAdornment={
          <Search
            className="h-4 w-4 shrink-0 text-secondary"
            strokeWidth={2}
            aria-hidden
          />
        }
        helperText={
          !productionUnitId
            ? "Elija la unidad a la derecha para filtrar"
            : searching
              ? "Buscando…"
              : searchHelper
        }
        data-test-id="manufacture-variant-search-field"
      />

      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto"
        data-test-id="manufacture-variant-search-results"
      >
        {!productionUnitId ? (
          <p className="text-sm text-muted-foreground">
            Seleccione una unidad de producción para ver variantes.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searching ? "Buscando…" : "Sin variantes para esta unidad."}
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.variantId}
              className="relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/80 bg-muted/20 shadow-sm"
              data-test-id={`manufacture-variant-card-${item.variantId}`}
            >
              <div className="min-w-0 flex-1 p-2.5">
                <p className="text-sm font-medium text-foreground">
                  {item.productName}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  SKU {item.sku}
                  {item.attributesCount > 0
                    ? ` · ${item.attributesCount} attrs`
                    : ""}
                </p>
                {!item.hasRecipe ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Sin receta: al completar no se descontarán insumos
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center justify-end border-t border-border/70 px-2.5 py-2">
                <IconButton
                  icon="Plus"
                  variant="action"
                  size="sm"
                  title="Agregar a la orden"
                  ariaLabel="Agregar variante a la orden"
                  onClick={() => onAddVariant(item)}
                  data-test-id={`manufacture-variant-add-${item.variantId}`}
                />
              </div>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
