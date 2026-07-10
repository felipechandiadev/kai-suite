"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { IconButton } from "@kai/ui";
import { TextField } from "@kai/ui";
import { NumberStepper } from "@kai/ui";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import type { ProductGridRow } from "@/features/inventory-products/types/product-grid.types";
import type { ListProductsForGridResult } from "@/features/inventory-products/actions/product.action";
import { InlineSepDot } from "@/shared/components/PurchaseDocumentBuilder/PurchaseDocumentProductPreview";
import {
  clampFeaturedSearchPageSize,
  ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE,
  ESHOP_FEATURED_URL_LIMIT,
  ESHOP_FEATURED_URL_PAGE,
  ESHOP_FEATURED_URL_QUERY,
} from "@/features/e-shop-featured/lib/parse-featured-search-url";
import {
  clampEshopFeaturedSearchPageSize,
  readEshopFeaturedSearchPageSize,
  writeEshopFeaturedSearchPageSize,
} from "@/features/e-shop-featured/lib/eshopFeaturedSearchStorage";

export const ESHOP_FEATURED_SEARCH_DEBOUNCE_MS = 400;

type Props = {
  search: ListProductsForGridResult;
  searchQuery: string;
  searchPage: number;
  featuredProductIds: string[];
  onAddProduct: (row: ProductGridRow) => void;
};

export function EShopFeaturedProductSearchPanel({
  search,
  searchQuery,
  searchPage,
  featuredProductIds,
  onAddProduct,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [draftSearch, setDraftSearch] = useState(searchQuery);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftPageSize, setDraftPageSize] = useState(() => ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedLimitRef = useRef(false);

  const navigate = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const urlPage = useMemo(() => {
    const raw = searchParams.get(ESHOP_FEATURED_URL_PAGE);
    const n = parseInt(raw || String(searchPage), 10);
    return Math.max(1, Number.isFinite(n) ? n : searchPage);
  }, [searchParams, searchPage]);

  const pageSizeFromUrl = useMemo(() => {
    const raw = searchParams.get(ESHOP_FEATURED_URL_LIMIT);
    const n = parseInt(raw || "", 10);
    if (Number.isFinite(n) && n >= 5 && n <= 50) {
      return n;
    }
    return search.limit;
  }, [search.limit, searchParams]);

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const inUrl = searchParams.get(ESHOP_FEATURED_URL_LIMIT);
    if (inUrl != null && inUrl !== "") {
      syncedLimitRef.current = true;
      return;
    }
    if (syncedLimitRef.current) {
      return;
    }
    const stored = readEshopFeaturedSearchPageSize(ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE);
    if (stored === ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE) {
      syncedLimitRef.current = true;
      return;
    }
    syncedLimitRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.set(ESHOP_FEATURED_URL_LIMIT, String(stored));
    navigate(next);
  }, [navigate, searchParams]);

  const pushSearchToUrl = useCallback(
    (q: string, page: number, limit: number) => {
      const next = new URLSearchParams(searchParams.toString());
      const t = q.trim();
      if (t) {
        next.set(ESHOP_FEATURED_URL_QUERY, t);
      } else {
        next.delete(ESHOP_FEATURED_URL_QUERY);
      }
      next.set(ESHOP_FEATURED_URL_PAGE, String(Math.max(1, page)));
      next.set(
        ESHOP_FEATURED_URL_LIMIT,
        String(clampFeaturedSearchPageSize(limit)),
      );
      navigate(next);
    },
    [navigate, searchParams],
  );

  const flushDebouncedSearchToUrl = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (draftSearch.trim() !== searchQuery.trim()) {
      pushSearchToUrl(draftSearch, 1, pageSizeFromUrl);
    }
  }, [draftSearch, pageSizeFromUrl, pushSearchToUrl, searchQuery]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (draftSearch.trim() === searchQuery.trim()) {
        return;
      }
      pushSearchToUrl(draftSearch, 1, pageSizeFromUrl);
    }, ESHOP_FEATURED_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [draftSearch, pageSizeFromUrl, pushSearchToUrl, searchQuery]);

  const searchTextPending = draftSearch.trim() !== searchQuery.trim();
  const totalPages = Math.max(1, Math.ceil(search.total / search.limit) || 1);

  const openSettings = useCallback(() => {
    setDraftPageSize(pageSizeFromUrl);
    setSettingsOpen(true);
  }, [pageSizeFromUrl]);

  const applySettings = useCallback(() => {
    const nextSize = clampEshopFeaturedSearchPageSize(
      draftPageSize,
      ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE,
    );
    writeEshopFeaturedSearchPageSize(nextSize, ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE);
    setSettingsOpen(false);
    pushSearchToUrl(draftSearch, 1, nextSize);
  }, [draftPageSize, draftSearch, pushSearchToUrl]);

  return (
    <aside
      className="flex h-full min-h-0 w-full min-w-0 flex-1 shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-background p-3 lg:max-h-none lg:max-w-sm lg:flex-none lg:basis-[22rem]"
      data-test-id="eshop-featured-search-panel"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Buscar productos
      </p>
      <TextField
        label="Buscar"
        name="eshop-featured-product-search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            flushDebouncedSearchToUrl();
          }
        }}
        placeholder="Nombre, marca, categoría…"
        alwaysShowLabel
        startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
        data-test-id="eshop-featured-search-input"
        aria-busy={searchTextPending}
      />
      {searchTextPending ? (
        <p className="text-xs text-muted-foreground" data-test-id="eshop-featured-search-pending">
          Sincronizando búsqueda…
        </p>
      ) : null}
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto"
        aria-busy={searchTextPending}
        data-test-id="eshop-featured-search-results"
      >
        {search.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin resultados.</p>
        ) : (
          search.rows.map((row) => {
            const isFeatured = featuredProductIds.includes(row.id);
            return (
              <article
                key={row.id}
                className={`relative flex min-h-0 flex-col overflow-hidden rounded-lg border shadow-sm ${
                  isFeatured ? "border-primary/40 bg-primary/5" : "border-border/80 bg-muted/20"
                }`}
                data-test-id={`eshop-featured-search-item-${row.id}`}
                data-featured={isFeatured ? "true" : undefined}
              >
                <div className="min-w-0 flex-1 p-2.5">
                  {row.categoryName ? (
                    <p
                      className="truncate text-[11px] text-muted-foreground"
                      title={row.categoryName}
                    >
                      {row.categoryName}
                    </p>
                  ) : null}
                  <p className="text-sm font-medium text-foreground">{row.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                    {row.brand ? <span>{row.brand}</span> : null}
                    {row.brand ? <InlineSepDot /> : null}
                    <span>
                      {row.variantCount} variante{row.variantCount === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
                <div
                  className="flex shrink-0 items-center justify-end gap-1 border-t border-border/70 px-2.5 py-2"
                  data-test-id={`eshop-featured-search-item-actions-${row.id}`}
                  role="group"
                  aria-label="Acciones"
                >
                  <IconButton
                    icon={isFeatured ? "Check" : "Plus"}
                    variant="action"
                    size="sm"
                    title={isFeatured ? "Ya destacado" : "Agregar a destacados"}
                    ariaLabel={
                      isFeatured ? "Producto ya destacado" : "Agregar producto a destacados"
                    }
                    disabled={isFeatured}
                    onClick={() => onAddProduct(row)}
                    data-test-id={`eshop-featured-search-add-${row.id}`}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <IconButton
            icon="Settings"
            variant="action"
            size="sm"
            title="Configuración del buscador"
            ariaLabel="Abrir configuración del buscador de productos"
            onClick={openSettings}
            data-test-id="eshop-featured-search-settings"
          />
          <span className="truncate text-xs text-muted-foreground">
            Pág. {urlPage} / {totalPages} ({search.total} productos)
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton
            icon="ChevronLeft"
            variant="action"
            size="sm"
            disabled={urlPage <= 1}
            title="Anterior"
            ariaLabel="Página anterior"
            onClick={() => pushSearchToUrl(draftSearch, urlPage - 1, pageSizeFromUrl)}
            data-test-id="eshop-featured-search-prev"
          />
          <IconButton
            icon="ChevronRight"
            variant="action"
            size="sm"
            disabled={urlPage >= totalPages}
            title="Siguiente"
            ariaLabel="Página siguiente"
            onClick={() => pushSearchToUrl(draftSearch, urlPage + 1, pageSizeFromUrl)}
            data-test-id="eshop-featured-search-next"
          />
        </div>
      </div>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Configuración del buscador"
        size="sm"
        data-test-id="eshop-featured-search-settings-dialog"
        actions={
          <>
            <Button variant="secondary" type="button" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="button" onClick={applySettings}>
              Guardar
            </Button>
          </>
        }
      >
        <NumberStepper
          label="Resultados por página"
          value={draftPageSize}
          onChange={(v) =>
            setDraftPageSize(
              clampEshopFeaturedSearchPageSize(v, ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE),
            )
          }
          min={5}
          max={50}
          step={1}
          allowNegative={false}
          data-test-id="eshop-featured-search-page-size"
        />
      </Dialog>
    </aside>
  );
}

export { ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE };
