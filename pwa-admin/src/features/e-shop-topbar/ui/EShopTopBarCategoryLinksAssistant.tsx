"use client";

import { useMemo, useState } from "react";
import { Alert, Button } from "@/shared/components";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import {
  buildCategoryNavLinksFromSelection,
  type CategoryNavLinkMode,
} from "../lib/build-category-nav-links";
import type { EShopNavLink } from "../types/eshop-topbar.types";

type Props = {
  categories: CategoryListItem[];
  currentLinks: EShopNavLink[];
  onApply: (navLinks: EShopNavLink[]) => void;
};

export function EShopTopBarCategoryLinksAssistant({
  categories,
  currentLinks,
  onApply,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [onlyWithProducts, setOnlyWithProducts] = useState(true);
  const [mode, setMode] = useState<CategoryNavLinkMode>("replace");
  const [notice, setNotice] = useState<string | null>(null);

  const visibleCategories = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (!onlyWithProducts) return sorted;
    return sorted.filter((c) => c.productCount > 0);
  }, [categories, onlyWithProducts]);

  const toggleCategory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setNotice(null);
  };

  const handleGenerate = () => {
    const selected = visibleCategories.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) {
      setNotice("Selecciona al menos una categoría.");
      return;
    }
    const { navLinks, omittedCount } = buildCategoryNavLinksFromSelection(
      selected,
      currentLinks,
      mode,
    );
    onApply(navLinks);
    if (omittedCount > 0) {
      setNotice(
        `Se generaron enlaces, pero ${omittedCount} quedaron fuera por el límite de 8. Guarda y ajusta manualmente si hace falta.`,
      );
    } else {
      setNotice("Enlaces generados en la lista de abajo. Revisa y guarda la topbar.");
    }
  };

  return (
    <div
      className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"
      data-test-id="topbar-category-links-assistant"
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">Asistente: enlaces por categoría</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Genera rutas como <code className="text-foreground">/productos?categoryId=…</code> para la
          navegación de la tienda.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onlyWithProducts}
          onChange={(e) => setOnlyWithProducts(e.target.checked)}
        />
        Solo categorías con productos
      </label>

      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
        {visibleCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay categorías disponibles.</p>
        ) : (
          visibleCategories.map((category) => (
            <label
              key={category.id}
              className="flex cursor-pointer items-center justify-between gap-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                {category.name}
              </span>
              <span className="text-xs text-muted-foreground">{category.productCount} prod.</span>
            </label>
          ))
        )}
      </div>

      <fieldset className="space-y-2 text-sm">
        <legend className="text-xs font-medium text-muted-foreground">Modo</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="topbar-category-mode"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          Reemplazar enlaces de categoría existentes
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="topbar-category-mode"
            checked={mode === "append"}
            onChange={() => setMode("append")}
          />
          Añadir al final
        </label>
      </fieldset>

      <Button
        type="button"
        variant="outlined"
        size="sm"
        onClick={handleGenerate}
        disabled={selectedIds.size === 0}
      >
        Generar enlaces
      </Button>

      {notice ? <Alert variant="info">{notice}</Alert> : null}
    </div>
  );
}
