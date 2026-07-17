"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { NumberStepper } from "@kai/ui";
import {
  createRecipeAction,
  listRecipesByOutputVariantAction,
  searchRecipeVariantCatalogAction,
  updateRecipeAction,
} from "@/features/recipes/actions/recipe.action";
import type { RecipeDto, RecipeTypeDto } from "@/features/recipes/types/recipe.types";
import type { PurchasingVariantSearchItem, PurchasingVariantSearchResult } from "@/features/purchasing-document/types/purchasing-document.types";
import type { CatalogProductType } from "@/features/inventory-products/types/product-grid.types";

export type CreateRecipeDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  outputVariantId: string;
  outputSku: string;
  productName: string;
  outputAttributeValues?: Record<string, string>;
  productType: CatalogProductType;
  /** Si viene definida, el diálogo edita esa receta en lugar de crear una nueva. */
  editRecipe?: RecipeDto | null;
};

type LineDraft = {
  key: string;
  variantId: string;
  productName: string;
  sku: string;
  stockBaseUnitLabel: string | null;
  qtyPerOutputUnit: number;
  wasteFactor: number;
};

function recipeTypeForProduct(pt: CreateRecipeDialogProps["productType"]): RecipeTypeDto {
  return pt === "SERVICE" ? "SERVICE" : "PRODUCTION";
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatMoney(amount: number): string {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  } catch {
    return String(Math.round(amount));
  }
}

function formatAttributes(av: Record<string, string>): string {
  const vals = Object.values(av).filter((x) => x.trim());
  return vals.length > 0 ? vals.join(" · ") : "—";
}

function parsedLinesValid(lines: LineDraft[]): boolean {
  return lines.length > 0 && lines.every((l) => Number.isFinite(l.qtyPerOutputUnit) && l.qtyPerOutputUnit > 0);
}

function linesFromRecipe(recipe: RecipeDto): LineDraft[] {
  return (recipe.lines ?? []).map((line) => ({
    key: line.id ?? uid(),
    variantId: line.inputVariantId,
    productName: line.inputProductName?.trim() || line.inputSku?.trim() || line.inputVariantId,
    sku: line.inputSku?.trim() || line.inputVariantId,
    stockBaseUnitLabel: line.inputStockBaseUnitLabel?.trim() || null,
    qtyPerOutputUnit: Number(line.qtyPerOutputUnit) || 1,
    wasteFactor: Number(line.wasteFactor ?? 0),
  }));
}

const EMPTY_CATALOG: PurchasingVariantSearchResult = {
  items: [],
  page: 1,
  pageSize: 10,
  total: 0,
};

export function CreateRecipeDialog({
  open,
  onClose,
  onSuccess,
  outputVariantId,
  outputSku,
  productName,
  outputAttributeValues,
  productType,
  editRecipe = null,
}: CreateRecipeDialogProps) {
  const isEditMode = Boolean(editRecipe?.id);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [existing, setExisting] = useState<RecipeDto[]>([]);
  const [version, setVersion] = useState(1);
  const [lines, setLines] = useState<LineDraft[]>([]);

  const [draftSearch, setDraftSearch] = useState("");
  /** Texto de búsqueda aplicado al API (debounced respecto a `draftSearch`). */
  const [committedSearch, setCommittedSearch] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [catalog, setCatalog] = useState<PurchasingVariantSearchResult>(EMPTY_CATALOG);

  const recipeKind = recipeTypeForProduct(productType);

  const resetForm = useCallback(() => {
    setError(null);
    setExisting([]);
    setVersion(1);
    setLines([]);
    setDraftSearch("");
    setCommittedSearch("");
    setSearchPage(1);
    setCatalog(EMPTY_CATALOG);
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const fetchCatalog = useCallback((q: string, page: number) => {
    startTransition(() => {
      void searchRecipeVariantCatalogAction(q, page).then(setCatalog);
    });
  }, []);

  useEffect(() => {
    if (!open || !outputVariantId.trim()) {
      return;
    }
    let cancelled = false;
    setError(null);
    setDraftSearch("");
    setCommittedSearch("");
    setSearchPage(1);

    if (isEditMode && editRecipe) {
      setExisting([]);
      setVersion(Math.max(1, editRecipe.version || 1));
      setLines(linesFromRecipe(editRecipe));
      return;
    }

    setLines([]);
    void listRecipesByOutputVariantAction(outputVariantId).then((list) => {
      if (cancelled) {
        return;
      }
      setExisting(list);
      const maxV = list.reduce((m, r) => Math.max(m, typeof r.version === "number" ? r.version : 0), 0);
      setVersion(Math.max(1, maxV + 1));
    });
    return () => {
      cancelled = true;
    };
  }, [open, outputVariantId, isEditMode, editRecipe]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const delay = draftSearch.trim() ? 400 : 0;
    const id = setTimeout(() => setCommittedSearch(draftSearch), delay);
    return () => clearTimeout(id);
  }, [draftSearch, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    fetchCatalog(committedSearch, searchPage);
  }, [open, committedSearch, searchPage, fetchCatalog]);

  const addVariant = useCallback(
    (item: PurchasingVariantSearchItem) => {
      if (item.id === outputVariantId) {
        return;
      }
      setLines((prev) => {
        const existingLine = prev.find((l) => l.variantId === item.id);
        if (existingLine) {
          return prev.map((l) =>
            l.variantId === item.id
              ? { ...l, qtyPerOutputUnit: Math.round((l.qtyPerOutputUnit + 1) * 1000) / 1000 }
              : l,
          );
        }
        return [
          ...prev,
          {
            key: uid(),
            variantId: item.id,
            productName: item.productName,
            sku: item.sku,
            stockBaseUnitLabel: item.stockBaseUnitLabel?.trim() || item.unitLabel?.trim() || null,
            qtyPerOutputUnit: 1,
            wasteFactor: 0,
          },
        ];
      });
    },
    [outputVariantId],
  );

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<Pick<LineDraft, "qtyPerOutputUnit" | "wasteFactor">>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const handleSubmit = () => {
    setError(null);
    const parsedLines = lines.map((l) => ({
      inputVariantId: l.variantId.trim(),
      qtyPerOutputUnit: l.qtyPerOutputUnit,
      wasteFactor: Number.isFinite(l.wasteFactor) ? l.wasteFactor : 0,
    }));
    startTransition(() => {
      void (async () => {
        const payload = {
          outputVariantId,
          recipeType: recipeKind,
          version,
          lines: parsedLines,
        };
        const r =
          isEditMode && editRecipe?.id
            ? await updateRecipeAction({ recipeId: editRecipe.id, ...payload })
            : await createRecipeAction(payload);
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error ?? "No se pudo guardar la receta");
        }
      })();
    });
  };

  const canSubmit = !isPending && productType !== "DIGITAL" && parsedLinesValid(lines);

  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize) || 1);

  const onDraftSearchChange = useCallback((value: string) => {
    setDraftSearch(value);
    setSearchPage(1);
  }, []);

  const outputAttributesLabel = formatAttributes(outputAttributeValues ?? {});
  const productLabel = productName.trim() || "Producto";
  const dialogTitle =
    outputAttributesLabel !== "—"
      ? `Receta · ${productLabel} · ${outputAttributesLabel}`
      : `Receta · ${productLabel}`;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={dialogTitle}
      size="xxl"
      scroll="paper"
      maxHeight="min(92vh, 900px)"
      data-test-id="recipe-create-dialog"
      alertArea={
        <>
          {productType === "DIGITAL" ? (
            <Alert variant="warning" data-test-id="recipe-create-warning-digital">
              Los productos digitales no suelen llevar receta de inventario.
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="error" data-test-id="recipe-create-error">
              {error}
            </Alert>
          ) : null}
        </>
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="recipe-create-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={isPending}
            data-test-id="recipe-create-submit"
          >
            Guardar receta
          </Button>
        </>
      }
    >
      <div
        className="flex min-h-0 min-w-0 flex-col gap-3 lg:flex-row lg:items-stretch"
        data-test-id="recipe-create-layout"
      >
        <aside
          className="flex h-[min(52vh,420px)] min-h-0 w-full min-w-0 shrink-0 flex-col gap-3 rounded-xl border border-border bg-muted/10 p-3 lg:h-[min(58vh,520px)] lg:max-w-sm lg:basis-[22rem]"
          data-test-id="recipe-variant-search-panel"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buscar variantes (insumos)</p>
          <TextField
            label="Buscar"
            name="recipe-catalog-search"
            value={draftSearch}
            onChange={(e) => onDraftSearchChange(e.target.value)}
            placeholder="Nombre, SKU, código, categoría…"
            startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
            data-test-id="recipe-catalog-search-field"
          />
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {catalog.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin resultados.</p>
            ) : (
              catalog.items.map((item) => {
                const isOutput = item.id === outputVariantId;
                return (
                  <article
                    key={item.id}
                    className={`rounded-lg border border-border/80 p-2.5 shadow-sm ${isOutput ? "bg-muted/30 opacity-60" : "bg-background"}`}
                    data-test-id={`recipe-catalog-card-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground" title={item.productName}>
                          {item.productName}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          SKU {item.sku}
                          {item.barcode ? ` · ${item.barcode}` : ""}
                        </p>
                        {item.categoryName ? (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.categoryName}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-foreground">
                          <span className="text-muted-foreground">Atributos: </span>
                          {formatAttributes(item.attributeValues)}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-foreground">
                          PMP {formatMoney(item.pmp ?? 0)}
                          {item.stockBaseUnitLabel ? (
                            <span className="text-muted-foreground"> / {item.stockBaseUnitLabel}</span>
                          ) : item.unitLabel ? (
                            <span className="text-muted-foreground"> · {item.unitLabel}</span>
                          ) : null}
                        </p>
                        {isOutput ? (
                          <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            Variante de salida de esta receta (no puede ser insumo).
                          </p>
                        ) : null}
                      </div>
                      <IconButton
                        icon="Plus"
                        variant="action"
                        size="sm"
                        title={isOutput ? "No disponible" : "Agregar a la receta"}
                        ariaLabel="Agregar variante a la receta"
                        disabled={isOutput}
                        onClick={() => addVariant(item)}
                        data-test-id={`recipe-catalog-add-${item.id}`}
                      />
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">
              Pág. {searchPage} / {totalPages} ({catalog.total} variantes)
            </span>
            <div className="flex gap-1">
              <IconButton
                icon="ChevronLeft"
                variant="action"
                size="sm"
                disabled={searchPage <= 1}
                title="Anterior"
                ariaLabel="Página anterior"
                onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                data-test-id="recipe-catalog-prev"
              />
              <IconButton
                icon="ChevronRight"
                variant="action"
                size="sm"
                disabled={searchPage >= totalPages}
                title="Siguiente"
                ariaLabel="Página siguiente"
                onClick={() => setSearchPage((p) => p + 1)}
                data-test-id="recipe-catalog-next"
              />
            </div>
          </div>
        </aside>

        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-background p-3 lg:h-[min(58vh,520px)]"
          data-test-id="recipe-detail-panel"
        >
          <div className="border-b border-border pb-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Variante</p>
              <p className="truncate font-semibold text-foreground" title={productName}>
                {productName}
              </p>
              {outputAttributesLabel !== "—" ? (
                <p className="text-sm text-foreground" data-test-id="recipe-output-attributes">
                  {outputAttributesLabel}
                </p>
              ) : null}
              <p className="font-mono text-xs text-muted-foreground">SKU {outputSku}</p>
            </div>
          </div>

          {existing.length > 0 && !isEditMode ? (
            <Alert variant="info" data-test-id="recipe-existing-info">
              Ya hay {existing.length} receta(s) registradas para esta variante.
            </Alert>
          ) : null}

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm" data-test-id="recipe-lines-table">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-2">Insumo</th>
                  <th className="w-36 py-2 pr-2">Cantidad</th>
                  <th className="w-36 py-2 pr-2">Desperdicio</th>
                  <th className="w-12 py-2 text-center"> </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className="border-b border-border/70 align-top" data-test-id={`recipe-line-${line.key}`}>
                      <td className="py-2 pr-2">
                        <p className="font-medium text-foreground">{line.productName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{line.sku}</p>
                      </td>
                      <td className="py-2 pr-2">
                        <NumberStepper
                          value={line.qtyPerOutputUnit}
                          onChange={(v) =>
                            updateLine(line.key, {
                              qtyPerOutputUnit: Math.max(0.001, Math.round(v * 1000) / 1000),
                            })
                          }
                          min={0.001}
                          step={0.01}
                          allowFloat
                          allowNegative={false}
                          label={line.stockBaseUnitLabel ?? undefined}
                          data-test-id={`recipe-qty-${line.key}`}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <NumberStepper
                          value={line.wasteFactor}
                          onChange={(v) =>
                            updateLine(line.key, {
                              wasteFactor: Math.max(0, Math.round(v * 1000) / 1000),
                            })
                          }
                          min={0}
                          step={0.01}
                          allowFloat
                          allowNegative={false}
                          label={line.stockBaseUnitLabel ?? undefined}
                          data-test-id={`recipe-waste-${line.key}`}
                        />
                      </td>
                      <td className="py-2 text-center">
                        <IconButton
                          icon="Trash2"
                          variant="action"
                          size="sm"
                          title="Quitar"
                          ariaLabel="Quitar línea"
                          onClick={() => removeLine(line.key)}
                          data-test-id={`recipe-remove-${line.key}`}
                        />
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
