"use client";

import { IconButton } from "@kai/ui";

type VariantDetailRecipeSectionProps = {
  onAddRecipe: () => void;
};

export function VariantDetailRecipeSection({ onAddRecipe }: VariantDetailRecipeSectionProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-background p-4" data-test-id="pv-section-recipe">
      <div className="flex items-start gap-2">
        <IconButton
          icon="Plus"
          variant="action"
          size="sm"
          className="mt-0.5 shrink-0"
          ariaLabel="Nueva receta"
          onClick={onAddRecipe}
          data-test-id="pv-detail-recipe-add"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Receta (BOM)</h2>
          <p className="mt-1 text-sm text-muted-foreground">Defina insumos por unidad de este SKU.</p>
        </div>
      </div>
    </section>
  );
}
