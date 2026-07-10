"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { IconButton } from "@kai/ui";
import {
  createRecipeAction,
  listRecipesByOutputVariantAction,
  searchRecipeVariantCatalogAction,
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
  productType: CatalogProductType;
};

type LineDraft = {
  key: string;
  variantId: string;
  productName: string;
  sku: string;
  qtyPerOutputUnit: string;
  wasteFactor: string;
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
  if (lines.length === 0) {
    return false;
  }
  for (const l of lines) {
    const qty = Number(String(l.qtyPerOutputUnit).replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      return false;
    }
  }
  return true;
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
  productType,
}: CreateRecipeDialogProps) {
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
  const subtitle =
    recipeKind === "SERVICE"
      ? "Insumos por cada unidad vendida de este SKU."
      : "Insumos por cada unidad fabricada de este SKU.";

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
    setLines([]);
    setDraftSearch("");
    setCommittedSearch("");
    setSearchPage(1);
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
  }, [open, outputVariantId]);

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
          const cur = Number(String(existingLine.qtyPerOutputUnit).replace(",", ".")) || 1;
          return prev.map((l) =>
            l.variantId === item.id
              ? { ...l, qtyPerOutputUnit: String(Math.round((cur + 1) * 1000) / 1000) }
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
            qtyPerOutputUnit: "1",
            wasteFactor: "0",
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
    const parsedLines = lines.map((l) => {
      const qty = Number(String(l.qtyPerOutputUnit).replace(",", "."));
      const waste = Number(String(l.wasteFactor).replace(",", "."));
      return {
        inputVariantId: l.variantId.trim(),
        qtyPerOutputUnit: qty,
        wasteFactor: Number.isFinite(waste) ? waste : 0,
      };
    });
    startTransition(() => {
      void (async () => {
        const r = await createRecipeAction({
          outputVariantId,
          recipeType: recipeKind,
          version,
          lines: parsedLines,
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
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

  const summaryLineCount = lines.length;

  const headerHint = useMemo(
    () =>
      "Busque variantes a la izquierda (igual que en recepciones u órdenes de compra) y agréguelas con +. Ajuste cantidades por unidad de salida en la tabla.",
    [],
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Receta (BOM)"
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
            data-test-id="recipe-create-submit"
          >
            Guardar receta
          </Button>
        </>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">{headerHint}</p>

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
                          PMP {formatMoney(item.pmp)}
                          {item.unitLabel ? <span className="text-muted-foreground"> · {item.unitLabel}</span> : null}
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
          <div className="flex flex-wrap items-end gap-3 border-b border-border pb-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Salida (esta receta)</p>
              <p className="truncate font-semibold text-foreground" title={productName}>
                {productName}
              </p>
              <p className="font-mono text-xs text-muted-foreground">SKU {outputSku}</p>
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <TextField
              label="Versión"
              name="recipe-version"
              value={String(version)}
              onChange={(e) => setVersion(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-24 shrink-0"
              data-test-id="recipe-version"
            />
          </div>

          {existing.length > 0 ? (
            <Alert variant="info" data-test-id="recipe-existing-info">
              Ya hay {existing.length} receta(s) registradas para esta variante. Puede guardar una nueva versión distinta.
            </Alert>
          ) : null}

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm" data-test-id="recipe-lines-table">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-2">Insumo</th>
                  <th className="w-28 py-2 pr-2">Cant. / salida</th>
                  <th className="w-28 py-2 pr-2">Desperdicio</th>
                  <th className="w-12 py-2 text-center"> </th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Agregue insumos desde el panel izquierdo con el botón + (misma búsqueda que recepciones / órdenes de
                      compra).
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.key} className="border-b border-border/70 align-top" data-test-id={`recipe-line-${line.key}`}>
                      <td className="py-2 pr-2">
                        <p className="font-medium text-foreground">{line.productName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{line.sku}</p>
                      </td>
                      <td className="py-2 pr-2">
                        <TextField
                          label=""
                          name={`recipe-qty-${line.key}`}
                          value={line.qtyPerOutputUnit}
                          onChange={(e) => updateLine(line.key, { qtyPerOutputUnit: e.target.value })}
                          placeholder="1"
                          data-test-id={`recipe-qty-${line.key}`}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <TextField
                          label=""
                          name={`recipe-waste-${line.key}`}
                          value={line.wasteFactor}
                          onChange={(e) => updateLine(line.key, { wasteFactor: e.target.value })}
                          placeholder="0"
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="mt-auto rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Líneas de insumo</span>
              <span className="tabular-nums font-medium text-foreground">{summaryLineCount}</span>
            </div>
          </footer>
        </section>
      </div>
    </Dialog>
  );
}
