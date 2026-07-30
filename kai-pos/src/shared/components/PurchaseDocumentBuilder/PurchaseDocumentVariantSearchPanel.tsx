"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Badge, Button, Dialog, IconButton, NumberStepper, TextField } from "@kai/ui";
import {
  clampPurchaseDocVariantSearchPageSize,
  PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE,
  readPurchaseDocVariantSearchPageSize,
  writePurchaseDocVariantSearchPageSize,
} from "./purchaseDocVariantSearchStorage";
import {
  formatMoney,
  InlineSepDot,
  ProductNameWithAttributes,
} from "./PurchaseDocumentProductPreview";

/** Mismo tinte que las cards con alerta en el grid de stock (kai-admin). */
const STOCK_THRESHOLD_ALERT_CARD_CLASS =
  "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/35";

function formatPurchaseAvailableQty(n: number): string {
  if (!Number.isFinite(n)) {
    return "0";
  }
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-6) {
    return String(rounded);
  }
  return n.toLocaleString("es-CL", { maximumFractionDigits: 2 });
}

/** Query en URL para búsqueda SSR de variantes. */
export const PURCHASE_DOC_URL_QUERY = "v";
/** Página de resultados (10 por página). */
export const PURCHASE_DOC_URL_PAGE = "vp";
/** Resultados por página (se envía al backend vía SSR / `PurchasingVariantSearchRequest.search`). */
export const PURCHASE_DOC_URL_LIMIT = "limit";

/** Tiempo de espera antes de reflejar el texto del buscador en la URL (evita un SSR por tecla). */
export const PURCHASE_DOC_SEARCH_DEBOUNCE_MS = 400;

export type PurchaseDocumentVariantSearchPanelProps = {
  variantSearch: PurchasingVariantSearchResult;
  searchQuery: string;
  searchPage: number;
  onAddVariant: (item: PurchasingVariantSearchItem) => void;
};

export function PurchaseDocumentVariantSearchPanel({
  variantSearch,
  searchQuery,
  searchPage,
  onAddVariant,
}: PurchaseDocumentVariantSearchPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [draftSearch, setDraftSearch] = useState(searchQuery);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftPageSize, setDraftPageSize] = useState(() => PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedLimitRef = useRef(false);

  /**
   * Misma idea que `DataGrid`/paginación de productos (`Pagination.tsx`): `router.push` con pathname + query (evita rutas relativas solo `?…`).
   * Sin `router.refresh()`: el App Router vuelve a ejecutar el Server Component de la ruta actual.
   * `refresh` + `replace` duplicaban GET y podían armar bucles.
   */
  const navigatePurchaseDocSearch = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const urlPage = useMemo(() => {
    const raw = searchParams.get(PURCHASE_DOC_URL_PAGE);
    const n = parseInt(raw || String(searchPage), 10);
    return Math.max(1, Number.isFinite(n) ? n : searchPage);
  }, [searchParams, searchPage]);

  const pageSizeFromUrl = useMemo(() => {
    const raw = searchParams.get(PURCHASE_DOC_URL_LIMIT);
    const n = parseInt(raw || "", 10);
    if (Number.isFinite(n) && n >= 1 && n <= 50) {
      return n;
    }
    return variantSearch.pageSize;
  }, [searchParams, variantSearch.pageSize]);

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  /** Si la URL no trae `limit` y el usuario guardó un tamaño distinto del default, reflejarlo en la URL para alinear SSR y cliente. */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const inUrl = searchParams.get(PURCHASE_DOC_URL_LIMIT);
    if (inUrl != null && inUrl !== "") {
      syncedLimitRef.current = true;
      return;
    }
    if (syncedLimitRef.current) {
      return;
    }
    const stored = readPurchaseDocVariantSearchPageSize();
    if (stored === PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE) {
      syncedLimitRef.current = true;
      return;
    }
    syncedLimitRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.set(PURCHASE_DOC_URL_LIMIT, String(stored));
    navigatePurchaseDocSearch(next);
  }, [navigatePurchaseDocSearch, searchParams]);

  const pushSearchToUrl = useCallback(
    (q: string, page: number, limit: number) => {
      const next = new URLSearchParams(searchParams.toString());
      const t = q.trim();
      if (t) {
        next.set(PURCHASE_DOC_URL_QUERY, t);
      } else {
        next.delete(PURCHASE_DOC_URL_QUERY);
      }
      next.set(PURCHASE_DOC_URL_PAGE, String(Math.max(1, page)));
      next.set(PURCHASE_DOC_URL_LIMIT, String(clampPurchaseDocVariantSearchPageSize(limit)));
      navigatePurchaseDocSearch(next);
    },
    [navigatePurchaseDocSearch, searchParams],
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
    }, PURCHASE_DOC_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [draftSearch, pageSizeFromUrl, pushSearchToUrl, searchQuery]);

  const searchTextPending = draftSearch.trim() !== searchQuery.trim();

  const totalPages = Math.max(1, Math.ceil(variantSearch.total / variantSearch.pageSize) || 1);

  const openSettings = useCallback(() => {
    setDraftPageSize(pageSizeFromUrl);
    setSettingsOpen(true);
  }, [pageSizeFromUrl]);

  const applySettings = useCallback(() => {
    const nextSize = clampPurchaseDocVariantSearchPageSize(draftPageSize);
    writePurchaseDocVariantSearchPageSize(nextSize);
    setSettingsOpen(false);
    pushSearchToUrl(draftSearch, 1, nextSize);
  }, [draftPageSize, draftSearch, pushSearchToUrl]);

  return (
    <aside
      className="flex min-h-0 w-full min-w-0 flex-1 shrink-0 flex-col gap-3 rounded-xl border border-border bg-background p-3 lg:h-full lg:max-h-none lg:min-h-0 lg:max-w-sm lg:flex-none lg:basis-[22rem]"
      data-test-id="purchase-document-search-panel"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buscar productos</p>
      <TextField
        label="Buscar"
        name="purchase-doc-variant-search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            flushDebouncedSearchToUrl();
          }
        }}
        placeholder="Nombre, SKU, código, categoría…"
        alwaysShowLabel
        startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
        data-test-id="purchase-doc-search-field"
        aria-busy={searchTextPending}
      />
      {searchTextPending ? (
        <p className="text-xs text-muted-foreground" data-test-id="purchase-doc-search-pending">
          Sincronizando búsqueda…
        </p>
      ) : null}
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto"
        aria-busy={searchTextPending}
        data-test-id="purchase-doc-search-results"
      >
        {variantSearch.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin resultados.</p>
        ) : (
          variantSearch.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onAddVariant(item)}
              title="Agregar a la recepción"
              className={`block w-full touch-manipulation rounded-lg border p-2.5 text-left shadow-sm transition-colors ${
                item.hasStockAlert
                  ? STOCK_THRESHOLD_ALERT_CARD_CLASS
                  : "border-border bg-surface hover:border-secondary focus:border-secondary focus:outline-none active:border-secondary/40 active:bg-secondary/10"
              }`}
              data-test-id={`purchase-doc-variant-card-${item.id}`}
              data-stock-alert={item.hasStockAlert ? "true" : undefined}
            >
              {item.categoryName ? (
                <p
                  className="truncate text-[11px] text-muted-foreground"
                  title={item.categoryName}
                >
                  {item.categoryName}
                </p>
              ) : null}
              <ProductNameWithAttributes
                name={item.productName}
                attributeValues={item.attributeValues}
                className="text-sm font-medium text-foreground"
              />
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-muted-foreground">
                <span>SKU {item.sku}</span>
                {item.barcode ? (
                  <>
                    <InlineSepDot />
                    <span>{item.barcode}</span>
                  </>
                ) : null}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums text-foreground">
                {item.pmp != null && Number(item.pmp) > 0 ? (
                  <span>
                    PMP {formatMoney(item.pmp)}
                    {item.stockBaseUnitLabel ? ` / ${item.stockBaseUnitLabel}` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sin PMP</span>
                )}
                {item.purchaseUnitLabel ? (
                  <>
                    <InlineSepDot />
                    <span className="text-muted-foreground">Compra: {item.purchaseUnitLabel}</span>
                  </>
                ) : null}
              </p>
              {item.storageStocks.length > 0 ? (
                <div
                  className="mt-1.5 flex flex-wrap gap-1"
                  data-test-id={`purchase-doc-variant-stock-badges-${item.id}`}
                >
                  {item.storageStocks.map((s) => {
                    const title = [s.storageName, s.branchName].filter(Boolean).join(" · ");
                    return (
                      <Badge
                        key={s.storageId}
                        variant={s.hasStockAlert ? "error-outlined" : "success-outlined"}
                        className={
                          s.hasStockAlert
                            ? `max-w-[11rem] truncate border ${STOCK_THRESHOLD_ALERT_CARD_CLASS}`
                            : "max-w-[11rem] truncate"
                        }
                        title={`${title} — Disp.: ${formatPurchaseAvailableQty(s.availableStock)}`}
                      >
                        <span className="font-medium">{s.storageName}</span>
                        <span className="mx-0.5 opacity-80">:</span>
                        <span className="tabular-nums">{formatPurchaseAvailableQty(s.availableStock)}</span>
                      </Badge>
                    );
                  })}
                </div>
              ) : null}
            </button>
          ))
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <IconButton
            icon="Settings"
            variant="action"
            size="sm"
            title="Configuración del buscador"
            ariaLabel="Abrir configuración del buscador de productos"
            onClick={openSettings}
            data-test-id="purchase-doc-search-settings"
          />
          <span className="truncate text-xs text-muted-foreground">
            Pág. {urlPage} / {totalPages} ({variantSearch.total} variantes)
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
            data-test-id="purchase-doc-search-prev"
          />
          <IconButton
            icon="ChevronRight"
            variant="action"
            size="sm"
            disabled={urlPage >= totalPages}
            title="Siguiente"
            ariaLabel="Página siguiente"
            onClick={() => pushSearchToUrl(draftSearch, urlPage + 1, pageSizeFromUrl)}
            data-test-id="purchase-doc-search-next"
          />
        </div>
      </div>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Configuración del buscador"
        size="sm"
        data-test-id="purchase-doc-search-settings-dialog"
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
          onChange={(v) => setDraftPageSize(clampPurchaseDocVariantSearchPageSize(v))}
          min={1}
          max={50}
          step={1}
          allowNegative={false}
          data-test-id="purchase-doc-search-page-size"
        />
      </Dialog>
    </aside>
  );
}
