"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Dialog } from "@kai/ui";
import { DotProgress, TextField } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { searchPosProductsAction } from "@/features/pos-products/actions/pos-products.action";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import {
  formatMoney,
  PosProductNameWithAttributes,
} from "@/features/pos-products/ui/posProductPreview";
import {
  POS_PRODUCT_SEARCH_DEBOUNCE_MS,
  readPosProductSearchPageSize,
} from "@/features/pos-products/lib/posProductSearchStorage";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import {
  addPosFavoriteProduct,
  removePosFavoriteProduct,
  readPosFavoriteProducts,
} from "../lib/pos-favorite-products-storage";
import {
  posFavoriteFromSearchItem,
  type PosFavoriteProductEntry,
} from "../types/pos-favorite-product.types";

type PosFavoriteProductsDialogProps = {
  open: boolean;
  onClose: () => void;
  pointOfSaleId: string;
  branchId: string | null;
  priceListId: string;
};

function InlineSepDot() {
  return (
    <span className="text-muted-foreground/60" aria-hidden>
      ·
    </span>
  );
}

export function PosFavoriteProductsDialog({
  open,
  onClose,
  pointOfSaleId,
  branchId,
  priceListId,
}: PosFavoriteProductsDialogProps) {
  const [favorites, setFavorites] = useState<PosFavoriteProductEntry[]>([]);
  const [draftSearch, setDraftSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<PosProductSearchItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => readPosProductSearchPageSize());
  const [total, setTotal] = useState(0);
  const [pickNotice, setPickNotice] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize) || 1),
    [total, pageSize],
  );

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.variantId)),
    [favorites],
  );

  useEffect(() => {
    if (!open) return;
    setFavorites(readPosFavoriteProducts(pointOfSaleId));
    setDraftSearch("");
    setSearchQuery("");
    setPage(1);
    setTotal(0);
    setItems([]);
    setError("");
    setPickNotice("");
    setPageSize(readPosProductSearchPageSize());
  }, [open, pointOfSaleId]);

  useEffect(() => {
    if (!pickNotice) return;
    const t = window.setTimeout(() => setPickNotice(""), 2200);
    return () => window.clearTimeout(t);
  }, [pickNotice]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(draftSearch.trim());
      setPage(1);
    }, POS_PRODUCT_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draftSearch, open]);

  const loadSearch = useCallback(async () => {
    if (!open || !priceListId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await searchPosProductsAction({
        query: searchQuery,
        priceListId,
        branchId,
        pointOfSaleId,
        page,
        pageSize,
      });
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setError(res.message);
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(res.products);
      setTotal(res.pagination.total);
      if (res.pagination.page !== page) {
        setPage(res.pagination.page);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al buscar");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [open, searchQuery, priceListId, branchId, pointOfSaleId, page, pageSize]);

  useEffect(() => {
    void loadSearch();
  }, [loadSearch]);

  const handlePickVariant = (item: PosProductSearchItem) => {
    const { items: next, added } = addPosFavoriteProduct(
      pointOfSaleId,
      posFavoriteFromSearchItem(item),
    );
    setFavorites(next);
    setPickNotice(
      added ? "Agregado a favoritos" : "Esa variante ya está en favoritos",
    );
  };

  const handleRemoveFavorite = (variantId: string) => {
    setFavorites(removePosFavoriteProduct(pointOfSaleId, variantId));
  };

  /** Altura del diálogo y del área útil (header + padding; sin action area). */
  const dialogHeight = "min(75vh, 700px)";
  const bodyHeight = "calc(min(75vh, 700px) - 5.75rem)";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Productos favoritos"
      size="xxl"
      scroll="paper"
      data-test-id="pos-favorite-products-dialog"
      height={dialogHeight}
      minHeight={dialogHeight}
      contentStyle={{ display: "flex", flexDirection: "column" }}
      showCloseButton
      closeButtonText="Cerrar"
    >
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-5"
        style={{ height: bodyHeight, minHeight: bodyHeight }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:h-full lg:max-w-[340px] lg:flex-none">
          <TextField
            label="Buscar producto"
            name="pos-favorite-product-search"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Nombre, SKU, código de barras…"
            autoComplete="off"
            alwaysShowLabel
            startAdornment={
              <Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />
            }
            data-test-id="pos-favorite-product-search-field"
          />
          {pickNotice ? (
            <p
              className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400"
              role="status"
            >
              {pickNotice}
            </p>
          ) : null}
          {error ? <p className="shrink-0 text-sm text-error">{error}</p> : null}
          <div
            className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border p-1.5"
            aria-busy={loading}
            data-test-id="pos-favorite-product-search-results"
          >
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-10">
                <DotProgress />
              </div>
            ) : items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? "Sin resultados."
                  : "Escribe para buscar variantes."}
              </p>
            ) : (
              <div className="space-y-1.5">
              {items.map((item) => {
                const isFavorite = favoriteIds.has(item.variantId);
                return (
                  <button
                    key={item.variantId}
                    type="button"
                    onClick={() => handlePickVariant(item)}
                    className={`block w-full rounded-lg border p-2 text-left shadow-sm transition-colors ${
                      isFavorite
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-surface hover:border-secondary active:bg-secondary/10"
                    }`}
                    data-test-id={`pos-favorite-search-card-${item.variantId}`}
                  >
                    <PosProductNameWithAttributes
                      name={item.productName}
                      attributes={item.attributes}
                      className="text-sm font-medium text-foreground"
                    />
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-muted-foreground">
                      <span>SKU {item.sku ?? "—"}</span>
                      {item.barcode?.trim() ? (
                        <>
                          <InlineSepDot />
                          <span>{item.barcode.trim()}</span>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-foreground">
                      {formatMoney(item.unitPriceWithTax)}
                      {isFavorite ? (
                        <span className="ml-2 text-muted-foreground">· En favoritos</span>
                      ) : null}
                    </p>
                  </button>
                );
              })}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-2">
            <span className="truncate text-xs text-muted-foreground">
              Pág. {page} / {totalPages}
              {total > 0 ? ` (${total} variantes)` : ""}
            </span>
            <div className="flex shrink-0 gap-1">
              <IconButton
                icon="ChevronLeft"
                variant="action"
                size="sm"
                disabled={page <= 1 || loading}
                title="Anterior"
                ariaLabel="Página anterior"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                data-test-id="pos-favorite-product-search-prev"
              />
              <IconButton
                icon="ChevronRight"
                variant="action"
                size="sm"
                disabled={page >= totalPages || loading}
                title="Siguiente"
                ariaLabel="Página siguiente"
                onClick={() => setPage((p) => p + 1)}
                data-test-id="pos-favorite-product-search-next"
              />
            </div>
          </div>
        </div>

        <aside
          className="flex min-h-0 flex-1 flex-col gap-2 lg:h-full lg:border-l lg:border-border lg:pl-5"
          aria-label="Favoritos seleccionados"
          data-test-id="pos-favorite-products-panel"
        >
          <h3 className="shrink-0 text-sm font-semibold text-foreground">
            Favoritos ({favorites.length})
          </h3>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/80 bg-muted/20 p-2">
            {favorites.length === 0 ? (
              <p className="flex h-full min-h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                Aún no hay favoritos. Agrega variantes desde el buscador.
              </p>
            ) : (
              <ul
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                role="list"
              >
                {favorites.map((fav) => (
                  <li
                    key={fav.variantId}
                    className="relative flex flex-col rounded-md border border-border bg-surface p-2 shadow-sm"
                    data-test-id={`pos-favorite-selected-card-${fav.variantId}`}
                  >
                    <div className="absolute right-0.5 top-0.5">
                      <IconButton
                        icon="Trash2"
                        variant="text"
                        size="sm"
                        ariaLabel="Quitar de favoritos"
                        title="Quitar"
                        onClick={() => handleRemoveFavorite(fav.variantId)}
                        data-test-id={`pos-favorite-remove-${fav.variantId}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1 pr-7">
                      <PosProductNameWithAttributes
                        name={fav.productName}
                        attributes={fav.attributes}
                        className="line-clamp-2 text-xs font-medium leading-tight text-foreground"
                      />
                      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                        SKU {fav.sku ?? "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium tabular-nums text-foreground">
                        {formatMoney(fav.unitPriceWithTax)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </Dialog>
  );
}
