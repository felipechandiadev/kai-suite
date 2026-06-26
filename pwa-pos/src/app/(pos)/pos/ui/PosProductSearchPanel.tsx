"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Tags } from "lucide-react";
import { searchPosProductsAction } from "@/features/pos-products/actions/pos-products.action";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import {
  looksLikeBarcodeScan,
  shouldAutoAddSingleResult,
} from "@/features/pos-products/lib/pos-barcode-scan";
import {
  clampPosProductSearchPageSize,
  POS_PRODUCT_SEARCH_DEBOUNCE_MS,
  POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE,
  readPosProductSearchPageSize,
  writePosProductSearchPageSize,
} from "@/features/pos-products/lib/posProductSearchStorage";
import {
  POS_PRODUCT_SEARCH_FOCUS_EVENT,
  requestPosProductSearchFocus,
} from "@/features/pos-products/lib/pos-product-search-focus";
import {
  formatMoney,
  PosProductNameWithAttributes,
  posDisplaySaleUnitSymbol,
  posFormatStockForCard,
} from "@/features/pos-products/ui/posProductPreview";
import { patchPosContextClient, type PosPriceListSnapshot } from "@/features/session/lib/pos-context-storage";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import {
  Button,
  Dialog,
  DotProgress,
  IconButton,
  NumberStepper,
  Select,
  Switch,
  TextField,
} from "@/shared/admin-shared";
import { PosFavoriteQuickPickBar } from "@/features/pos-settings/ui/PosFavoriteQuickPickBar";

/**
 * Alto del buscador de productos respecto al viewport (`vh`).
 * Ej.: `88` → el panel mide **88vh** (= 88% de la altura visible de la ventana).
 * Compartido con el carrito en `PosWorkspace` para alinear columnas.
 */
export const POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH = 88;

type Props = {
  priceListId: string;
  priceListOptions: PosPriceListSnapshot[];
  branchId: string | null;
  pointOfSaleId: string;
  onPriceListChange: (id: string) => void;
  /** Recarga listas de precios del POS desde el backend (configuración del buscador). */
  onRefreshPriceListOptions?: () => void | Promise<void>;
  onPickProduct?: (item: PosProductSearchItem) => void;
  disabled?: boolean;
  disabledHint?: string;
  /** En móvil el panel ocupa el alto del contenedor padre (sin 88vh fijo). */
  compactLayout?: boolean;
};

export default function PosProductSearchPanel({
  priceListId,
  priceListOptions,
  branchId,
  pointOfSaleId,
  onPriceListChange,
  onRefreshPriceListOptions,
  onPickProduct,
  disabled = false,
  disabledHint,
  compactLayout = false,
}: Props) {
  const [draftSearch, setDraftSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchCommittedRef = useRef("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftPageSize, setDraftPageSize] = useState(POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE);
  const [draftPriceListId, setDraftPriceListId] = useState(priceListId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<PosProductSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [resultPageSize, setResultPageSize] = useState(POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchFieldWrapRef = useRef<HTMLDivElement>(null);
  /** Tras Enter o código tipo barras: agregar al carrito si hay un solo resultado. */
  const scanAutoAddRef = useRef(false);
  const [scanAddedHint, setScanAddedHint] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);

  const focusSearchField = useCallback(() => {
    const input =
      searchFieldWrapRef.current?.querySelector<HTMLInputElement>("input") ??
      document.querySelector<HTMLInputElement>('[data-test-id="pos-product-search-field"]');
    input?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (disabled) return;
    const t = window.setTimeout(() => focusSearchField(), 80);
    return () => clearTimeout(t);
  }, [disabled, focusSearchField]);

  useEffect(() => {
    const onFocusRequest = () => {
      if (disabled) return;
      window.setTimeout(() => focusSearchField(), 80);
    };
    window.addEventListener(POS_PRODUCT_SEARCH_FOCUS_EVENT, onFocusRequest);
    return () => window.removeEventListener(POS_PRODUCT_SEARCH_FOCUS_EVENT, onFocusRequest);
  }, [disabled, focusSearchField]);

  const clearSearch = useCallback(() => {
    setDraftSearch("");
    setSearchQuery("");
    searchCommittedRef.current = "";
    setPage(1);
  }, []);

  useEffect(() => {
    const n = readPosProductSearchPageSize();
    setPageSize(n);
    setDraftPageSize(n);
  }, []);

  useEffect(() => {
    searchCommittedRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const next = draftSearch.trim();
      if (next === searchCommittedRef.current.trim()) return;
      if (looksLikeBarcodeScan(next, 8)) {
        scanAutoAddRef.current = true;
      }
      setSearchQuery(draftSearch);
      setPage(1);
    }, POS_PRODUCT_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draftSearch]);

  const canSearch = priceListId.trim() !== "";

  useEffect(() => {
    setPage(1);
  }, [pageSize, priceListId, branchId, pointOfSaleId]);

  const tryAutoAddSingleResult = useCallback(
    (products: PosProductSearchItem[], totalCount: number, currentPage: number) => {
      if (
        !shouldAutoAddSingleResult({
          total: totalCount,
          itemCount: products.length,
          page: currentPage,
          scanIntent: scanAutoAddRef.current,
        })
      ) {
        scanAutoAddRef.current = false;
        return false;
      }
      scanAutoAddRef.current = false;
      if (disabled || !onPickProduct) return false;
      onPickProduct(products[0]!);
      clearSearch();
      setScanAddedHint(`${products[0]!.productName} agregado al carrito`);
      focusSearchField();
      return true;
    },
    [clearSearch, disabled, focusSearchField, onPickProduct],
  );

  useEffect(() => {
    if (!scanAddedHint) return;
    const t = window.setTimeout(() => setScanAddedHint(""), 2200);
    return () => clearTimeout(t);
  }, [scanAddedHint]);

  const load = useCallback(async () => {
    if (!canSearch) return;
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
        scanAutoAddRef.current = false;
        if (redirectToLoginIfUnauthorized(res)) return;
        setError(res.message);
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(res.products);
      setTotal(res.pagination.total);
      setResultPageSize(res.pagination.pageSize);
      tryAutoAddSingleResult(res.products, res.pagination.total, page);
    } catch (e) {
      scanAutoAddRef.current = false;
      setError(e instanceof Error ? e.message : "Error al buscar");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    canSearch,
    searchQuery,
    priceListId,
    branchId,
    pointOfSaleId,
    page,
    pageSize,
    tryAutoAddSingleResult,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchTextPending = draftSearch.trim() !== searchQuery.trim();

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / (resultPageSize || pageSize)) || 1),
    [total, resultPageSize, pageSize],
  );

  const flushDebouncedSearch = useCallback((): "committed" | "unchanged" => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const next = draftSearch.trim();
    if (next === searchCommittedRef.current.trim()) {
      return "unchanged";
    }
    if (looksLikeBarcodeScan(next)) {
      scanAutoAddRef.current = true;
    }
    setSearchQuery(draftSearch);
    setPage(1);
    return "committed";
  }, [draftSearch]);

  useEffect(() => {
    if (!settingsOpen) return;
    setDraftPriceListId(priceListId);
  }, [settingsOpen, priceListId, priceListOptions]);

  const openSettings = useCallback(() => {
    setDraftPageSize(pageSize);
    setDraftPriceListId(priceListId);
    void onRefreshPriceListOptions?.();
    setSettingsOpen(true);
  }, [pageSize, priceListId, onRefreshPriceListOptions]);

  const applySettings = useCallback(() => {
    const nextSize = clampPosProductSearchPageSize(draftPageSize);
    writePosProductSearchPageSize(nextSize);
    setPageSize(nextSize);
    if (draftPriceListId && draftPriceListId.trim() && draftPriceListId !== priceListId) {
      onPriceListChange(draftPriceListId);
      patchPosContextClient({ priceListId: draftPriceListId });
    }
    setPage(1);
    setSettingsOpen(false);
    requestPosProductSearchFocus();
  }, [draftPageSize, draftPriceListId, onPriceListChange, priceListId]);

  const selectedPriceListName = useMemo(() => {
    const found = priceListOptions.find((p) => String(p.id) === String(priceListId));
    return found?.name?.trim() || "—";
  }, [priceListId, priceListOptions]);

  return (
    <aside
      className={`relative flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:p-4 ${
        compactLayout ? "h-full min-h-0" : ""
      }`}
      style={compactLayout ? undefined : { height: `${POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH}vh` }}
      data-test-id="pos-product-search-panel"
    >
      {disabled ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/75 p-4 text-center text-sm text-muted-foreground"
          aria-hidden
        >
          {disabledHint ?? "Búsqueda de productos deshabilitada en este modo."}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <Switch
          checked={showFavorites}
          onChange={setShowFavorites}
          label="Favoritos"
          labelPosition="right"
          disabled={disabled}
          className="shrink-0"
          data-test-id="pos-product-favorites-switch"
        />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <p
            className="min-w-0 truncate text-sm font-medium text-foreground"
            data-test-id="pos-product-selected-price-list"
            title={selectedPriceListName}
          >
            {selectedPriceListName}
          </p>
          <Tags
            size={18}
            strokeWidth={2}
            className="shrink-0 text-primary"
            aria-hidden
            data-test-id="pos-product-price-list-icon"
          />
        </div>
      </div>

      {showFavorites ? (
        <PosFavoriteQuickPickBar
          pointOfSaleId={pointOfSaleId}
          priceListId={priceListId}
          branchId={branchId}
          disabled={disabled}
          onPickProduct={onPickProduct}
        />
      ) : null}

      <div ref={searchFieldWrapRef}>
      <TextField
        label="Buscar productos"
        name="pos-product-search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            scanAutoAddRef.current = true;
            const status = flushDebouncedSearch();
            if (status === "unchanged" && !loading) {
              tryAutoAddSingleResult(items, total, page);
            }
          }
        }}
        placeholder="Nombre, SKU, código de barras…"
        autoComplete="off"
        alwaysShowLabel
        startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
        data-test-id="pos-product-search-field"
        aria-busy={searchTextPending}
      />
      </div>

      {scanAddedHint ? (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400" role="status" data-test-id="pos-product-scan-added-hint">
          {scanAddedHint}
        </p>
      ) : null}

      {searchTextPending ? (
        <p className="text-xs text-muted-foreground" data-test-id="pos-product-search-pending">
          Sincronizando búsqueda…
        </p>
      ) : null}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto"
        aria-busy={searchTextPending || loading}
        data-test-id="pos-product-search-results"
      >
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-10">
            <DotProgress />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin resultados.</p>
        ) : (
          items.map((item) => {
            const saleUnitLabel = posDisplaySaleUnitSymbol(item);
            const stockLabel = posFormatStockForCard(item);
            const canPick = !disabled && !!onPickProduct;
            return (
              <button
                key={item.variantId}
                type="button"
                disabled={!canPick}
                onClick={() => onPickProduct?.(item)}
                title={canPick ? "Agregar al carrito" : undefined}
                className={`block w-full touch-manipulation rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition-colors ${
                  canPick
                    ? "cursor-pointer border-border hover:border-secondary focus:border-secondary focus:outline-none active:border-secondary/40 active:bg-secondary/10"
                    : "cursor-not-allowed border-border opacity-60"
                }`}
                data-test-id={`pos-product-variant-card-${item.variantId}`}
              >
                <PosProductNameWithAttributes
                  name={item.productName}
                  attributes={item.attributes}
                  className="break-words text-sm font-medium leading-snug text-foreground"
                />
                <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                  SKU {item.sku ?? "—"}
                  {item.barcode?.trim() ? ` · ${item.barcode.trim()}` : ""}
                </p>
                <div className="mt-1.5 flex flex-col gap-0.5 text-xs tabular-nums text-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5">
                  <span className="font-semibold">{formatMoney(item.unitPriceWithTax)}</span>
                  {saleUnitLabel ? (
                    <span className="text-muted-foreground sm:before:content-['·'] sm:before:mr-1.5">
                      {saleUnitLabel}
                    </span>
                  ) : null}
                  <span className="font-mono text-[11px] text-muted-foreground sm:before:content-['·'] sm:before:mr-1.5">
                    Stock:{" "}
                    <span className="font-semibold text-foreground">{stockLabel}</span>
                  </span>
                </div>
              </button>
            );
          })
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
            data-test-id="pos-product-search-settings"
          />
          <span className="truncate text-xs text-muted-foreground">
            Pág. {page} / {totalPages} ({total} productos)
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton
            icon="ChevronLeft"
            variant="action"
            size="sm"
            disabled={page <= 1 || loading}
            title="Anterior"
            ariaLabel="Página anterior"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            data-test-id="pos-product-search-prev"
          />
          <IconButton
            icon="ChevronRight"
            variant="action"
            size="sm"
            disabled={page >= totalPages || loading}
            title="Siguiente"
            ariaLabel="Página siguiente"
            onClick={() => setPage((p) => p + 1)}
            data-test-id="pos-product-search-next"
          />
        </div>
      </div>

      <Dialog
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          requestPosProductSearchFocus();
        }}
        title="Configuración del buscador"
        size="sm"
        data-test-id="pos-product-search-settings-dialog"
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
        <div className="grid gap-4">
          <Select
            label="Lista de precios"
            placeholder="Lista de precios"
            density="compact"
            value={draftPriceListId || null}
            onChange={(id) => setDraftPriceListId(id ? String(id) : "")}
            options={priceListOptions.map((p) => ({ id: p.id, label: p.name }))}
            disabled={priceListOptions.length === 0}
            alwaysShowLabel
            data-test-id="pos-product-search-price-list"
          />
          {priceListOptions.length < 2 ? (
            <p className="text-xs text-muted-foreground">
              {priceListOptions.length === 0
                ? "Este punto de venta no tiene listas de precios activas."
                : "Solo hay una lista de precios asociada a este punto de venta."}
            </p>
          ) : null}
        <NumberStepper
          label="Resultados por página"
          value={draftPageSize}
          onChange={(v) => setDraftPageSize(clampPosProductSearchPageSize(v))}
          min={1}
          max={50}
          step={1}
          allowNegative={false}
          data-test-id="pos-product-search-page-size"
        />
        </div>
      </Dialog>
    </aside>
  );
}
