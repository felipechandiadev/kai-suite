"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Dialog, DotProgress } from "@kai/ui";
import { listPosDiningRecipesForVariantAction } from "@/features/dining/actions/dining-pos.action";
import type { PosDiningRecipeSummary } from "@/features/dining/types/dining-recipe.types";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import {
  formatMoney,
  PosProductNameWithAttributes,
  posDisplaySaleUnitSymbol,
} from "@/features/pos-products/ui/posProductPreview";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";

type Props = {
  open: boolean;
  onClose: () => void;
  item: PosProductSearchItem | null;
};

function formatQty(n: number) {
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 4,
    useGrouping: false,
  }).format(n);
}

export function PosDiningMenuVariantInfoDialog({ open, onClose, item }: Props) {
  const [recipes, setRecipes] = useState<PosDiningRecipeSummary[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item?.variantId) {
      setRecipes([]);
      setRecipeError(null);
      setLoadingRecipe(false);
      return;
    }
    let cancelled = false;
    setLoadingRecipe(true);
    setRecipeError(null);
    void listPosDiningRecipesForVariantAction(item.variantId)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          if (redirectToLoginIfUnauthorized(res)) return;
          setRecipeError(res.message);
          setRecipes([]);
          return;
        }
        setRecipes(res.recipes.filter((r) => r.isActive));
      })
      .catch((e) => {
        if (cancelled) return;
        setRecipeError(e instanceof Error ? e.message : "No se pudo cargar la receta");
        setRecipes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecipe(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, item?.variantId]);

  const recipe = useMemo(() => {
    if (recipes.length === 0) return null;
    return (
      recipes.find((r) => r.type === "PRODUCTION") ??
      recipes.find((r) => r.lines.length > 0) ??
      recipes[0] ??
      null
    );
  }, [recipes]);

  const saleUnit = item ? posDisplaySaleUnitSymbol(item) : null;
  const imageUrl = item?.productImageUrl?.trim() || null;
  const attributes = item?.attributes ?? [];
  const description = item?.productDescription?.trim() || null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? "Detalle de producto" : "Producto"}
      size="md"
      data-test-id="pos-dining-menu-variant-info-dialog"
    >
      {!item ? (
        <p className="text-sm text-muted-foreground">Sin producto seleccionado.</p>
      ) : (
        <div className="flex flex-col gap-4" data-test-id="pos-dining-menu-variant-info-body">
          <div className="flex gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.productName}
                className="h-24 w-24 shrink-0 rounded-lg border border-border object-cover"
                data-test-id="pos-dining-menu-variant-info-image"
              />
            ) : (
              <div
                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-[11px] text-muted-foreground"
                data-test-id="pos-dining-menu-variant-info-image-empty"
              >
                Sin imagen
              </div>
            )}
            <div className="min-w-0 flex-1">
              <PosProductNameWithAttributes
                name={item.productName}
                attributes={item.attributes}
                className="text-sm font-semibold leading-snug text-foreground"
              />
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                SKU {item.sku ?? "—"}
                {item.barcode?.trim() ? ` · ${item.barcode.trim()}` : ""}
              </p>
              <p className="mt-1 text-sm tabular-nums text-foreground">
                <span className="font-semibold">{formatMoney(item.unitPriceWithTax)}</span>
                {saleUnit ? (
                  <span className="text-muted-foreground"> · {saleUnit}</span>
                ) : null}
              </p>
              {description ? (
                <p className="mt-2 text-xs text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>

          <section data-test-id="pos-dining-menu-variant-info-attrs">
            <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Atributos
            </h3>
            {attributes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin atributos.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {attributes.map((a) => (
                  <Badge
                    key={`${a.attributeId}-${a.attributeValue}`}
                    variant="primary-outlined"
                    className="max-w-full truncate text-xs font-normal"
                  >
                    {a.attributeName}: {a.attributeValue}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <section data-test-id="pos-dining-menu-variant-info-recipe">
            <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Receta
            </h3>
            {recipeError ? (
              <Alert variant="error" className="text-sm">
                {recipeError}
              </Alert>
            ) : loadingRecipe ? (
              <div className="flex justify-center py-4">
                <DotProgress />
              </div>
            ) : !recipe || recipe.lines.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin receta activa.</p>
            ) : (
              <ul className="space-y-1.5">
                {recipe.lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {line.inputProductName?.trim() || "Insumo"}
                      </p>
                      {line.inputSku?.trim() ? (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          SKU {line.inputSku.trim()}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 tabular-nums text-xs text-foreground">
                      {formatQty(line.qtyPerOutputUnit)}
                      {line.inputStockBaseUnitLabel?.trim()
                        ? ` ${line.inputStockBaseUnitLabel.trim()}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Dialog>
  );
}
