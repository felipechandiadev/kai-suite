"use client";

import { useEffect, useMemo, useState } from "react";
import { IconButton } from "@kai/ui";
import { listRecipesByOutputVariantAction } from "@/features/recipes/actions/recipe.action";
import type { RecipeDto } from "@/features/recipes/types/recipe.types";

type VariantDetailRecipeSectionProps = {
  outputVariantId: string;
  refreshKey?: number;
  onCreateRecipe: () => void;
  onEditRecipe: (recipe: RecipeDto) => void;
};

function formatQty(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "");
}

export function VariantDetailRecipeSection({
  outputVariantId,
  refreshKey = 0,
  onCreateRecipe,
  onEditRecipe,
}: VariantDetailRecipeSectionProps) {
  const [recipes, setRecipes] = useState<RecipeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void listRecipesByOutputVariantAction(outputVariantId)
      .then((list) => {
        if (!cancelled) {
          setRecipes(list);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "No se pudieron cargar las recetas");
          setRecipes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [outputVariantId, refreshKey]);

  const displayRecipe = useMemo(
    () => recipes.find((recipe) => recipe.isActive) ?? recipes[0] ?? null,
    [recipes],
  );

  return (
    <section className="space-y-4 rounded-lg border border-border bg-background p-4" data-test-id="pv-section-recipe">
      <div className="flex items-start gap-2">
        <IconButton
          icon={displayRecipe ? "Pencil" : "Plus"}
          variant="action"
          size="sm"
          className="mt-0.5 shrink-0"
          ariaLabel={displayRecipe ? "Editar receta" : "Nueva receta"}
          onClick={() => (displayRecipe ? onEditRecipe(displayRecipe) : onCreateRecipe())}
          data-test-id={displayRecipe ? "pv-detail-recipe-edit" : "pv-detail-recipe-add"}
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Receta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Insumos en unidad de stock por cada unidad preparada de esta variante.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground" data-test-id="pv-detail-recipe-loading">
          Cargando receta…
        </p>
      ) : null}

      {loadError ? (
        <p className="text-sm text-error" data-test-id="pv-detail-recipe-error">
          {loadError}
        </p>
      ) : null}

      {!loading && !loadError && !displayRecipe ? (
        <p className="text-sm text-muted-foreground" data-test-id="pv-detail-recipe-empty">
          Aún no hay receta guardada. Use + para crear una.
        </p>
      ) : null}

      {displayRecipe ? (
        <div className="space-y-3" data-test-id="pv-detail-recipe-content">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Insumo</th>
                  <th className="w-28 px-3 py-2">Cantidad</th>
                  <th className="w-28 px-3 py-2">Desperdicio</th>
                </tr>
              </thead>
              <tbody>
                {(displayRecipe.lines ?? []).map((line) => {
                  const unit = line.inputStockBaseUnitLabel?.trim();
                  return (
                    <tr key={line.id ?? line.inputVariantId} className="border-b border-border/70">
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">
                          {line.inputProductName?.trim() || line.inputSku || line.inputVariantId}
                        </p>
                        {line.inputSku ? (
                          <p className="font-mono text-xs text-muted-foreground">{line.inputSku}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-foreground">
                        {formatQty(line.qtyPerOutputUnit)}
                        {unit ? <span className="ml-1 text-muted-foreground">{unit}</span> : null}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-foreground">
                        {formatQty(line.wasteFactor ?? 0)}
                        {unit ? <span className="ml-1 text-muted-foreground">{unit}</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {recipes.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              Mostrando la receta activa ({recipes.length} versiones registradas).
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
