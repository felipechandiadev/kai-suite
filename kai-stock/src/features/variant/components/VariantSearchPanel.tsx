"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button, Dialog, IconButton, TextField } from "@kai/ui";
import { NumberStepper } from "@kai/ui";
import type { VariantSearchItem, VariantSearchResult } from "../types/variant-search.types";
import {
  VARIANT_SEARCH_DEBOUNCE_MS,
  VARIANT_SEARCH_URL_LIMIT,
  VARIANT_SEARCH_URL_PAGE,
  VARIANT_SEARCH_URL_QUERY,
} from "../lib/parse-variant-search-url";
import {
  clampVariantSearchPageSize,
  readVariantSearchPageSize,
  VARIANT_SEARCH_DEFAULT_PAGE_SIZE,
  writeVariantSearchPageSize,
} from "../lib/variantSearchStorage";
import { variantDetailPath } from "../lib/variant-routes";
import {
  formatMoney,
  InlineSepDot,
  VariantProductNameWithAttributes,
} from "../ui/VariantProductPreview";

export type VariantSearchPanelProps = {
  variantSearch: VariantSearchResult;
  searchQuery: string;
  searchPage: number;
};

export default function VariantSearchPanel({
  variantSearch,
  searchQuery,
  searchPage,
}: VariantSearchPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [draftSearch, setDraftSearch] = useState(searchQuery);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftPageSize, setDraftPageSize] = useState(VARIANT_SEARCH_DEFAULT_PAGE_SIZE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedLimitRef = useRef(false);

  const navigateSearch = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const urlPage = useMemo(() => {
    const raw = searchParams.get(VARIANT_SEARCH_URL_PAGE);
    const n = parseInt(raw || String(searchPage), 10);
    return Math.max(1, Number.isFinite(n) ? n : searchPage);
  }, [searchParams, searchPage]);

  const pageSizeFromUrl = useMemo(() => {
    const raw = searchParams.get(VARIANT_SEARCH_URL_LIMIT);
    const n = parseInt(raw || "", 10);
    if (Number.isFinite(n) && n >= 1 && n <= 50) {
      return n;
    }
    return variantSearch.pageSize;
  }, [searchParams, variantSearch.pageSize]);

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  /** Si la URL no trae `limit`, reflejar el valor guardado en localStorage (alinea SSR tras navegación). */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const inUrl = searchParams.get(VARIANT_SEARCH_URL_LIMIT);
    if (inUrl != null && inUrl !== "") {
      syncedLimitRef.current = true;
      return;
    }
    if (syncedLimitRef.current) {
      return;
    }
    const stored = readVariantSearchPageSize();
    if (stored === VARIANT_SEARCH_DEFAULT_PAGE_SIZE) {
      syncedLimitRef.current = true;
      return;
    }
    syncedLimitRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.set(VARIANT_SEARCH_URL_LIMIT, String(stored));
    navigateSearch(next);
  }, [navigateSearch, searchParams]);

  const pushSearchToUrl = useCallback(
    (q: string, page: number, limit: number) => {
      const next = new URLSearchParams(searchParams.toString());
      const t = q.trim();
      if (t) {
        next.set(VARIANT_SEARCH_URL_QUERY, t);
      } else {
        next.delete(VARIANT_SEARCH_URL_QUERY);
      }
      next.set(VARIANT_SEARCH_URL_PAGE, String(Math.max(1, page)));
      next.set(VARIANT_SEARCH_URL_LIMIT, String(clampVariantSearchPageSize(limit)));
      navigateSearch(next);
    },
    [navigateSearch, searchParams],
  );

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
    }, VARIANT_SEARCH_DEBOUNCE_MS);
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
    const nextSize = clampVariantSearchPageSize(draftPageSize);
    writeVariantSearchPageSize(nextSize);
    setSettingsOpen(false);
    pushSearchToUrl(draftSearch, 1, nextSize);
  }, [draftPageSize, draftSearch, pushSearchToUrl]);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <TextField
        label="Buscar productos"
        name="variant-search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        placeholder="Nombre, SKU, código, categoría…"
        alwaysShowLabel
        startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
        data-test-id="variant-search-field"
        aria-busy={searchTextPending}
      />

      {searchTextPending ? (
        <p className="text-xs text-muted-foreground" data-test-id="variant-search-pending">
          Sincronizando búsqueda…
        </p>
      ) : null}

      <div
        className="flex flex-col gap-2"
        aria-busy={searchTextPending}
        data-test-id="variant-search-results"
      >
        {variantSearch.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searchQuery.trim() ? "Sin resultados." : "Escribe para buscar productos."}
          </p>
        ) : (
          variantSearch.items.map((item) => (
            <VariantSearchCard key={item.id} item={item} />
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
            data-test-id="variant-search-settings"
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
            data-test-id="variant-search-prev"
          />
          <IconButton
            icon="ChevronRight"
            variant="action"
            size="sm"
            disabled={urlPage >= totalPages}
            title="Siguiente"
            ariaLabel="Página siguiente"
            onClick={() => pushSearchToUrl(draftSearch, urlPage + 1, pageSizeFromUrl)}
            data-test-id="variant-search-next"
          />
        </div>
      </div>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Configuración del buscador"
        size="sm"
        data-test-id="variant-search-settings-dialog"
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
          onChange={(v) => setDraftPageSize(clampVariantSearchPageSize(v))}
          min={1}
          max={50}
          step={1}
          allowNegative={false}
          data-test-id="variant-search-page-size"
        />
      </Dialog>
    </div>
  );
}

function VariantSearchCard({ item }: { item: VariantSearchItem }) {
  const href = variantDetailPath(item.id);
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-surface p-3 shadow-sm transition-colors hover:border-secondary/50"
      data-test-id={`variant-search-card-${item.id}`}
    >
      <VariantProductNameWithAttributes
        name={item.productName}
        attributeValues={item.attributeValues}
        className="text-sm font-medium text-foreground"
      />
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-muted-foreground">
        <span>SKU {item.sku || "—"}</span>
        {item.barcode ? (
          <>
            <InlineSepDot />
            <span>{item.barcode}</span>
          </>
        ) : null}
      </p>
      {item.categoryName ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{item.categoryName}</p>
      ) : null}
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums text-foreground">
        <span>
          PMP{" "}
          {item.pmp != null && Number.isFinite(item.pmp) ? formatMoney(item.pmp) : "—"}
        </span>
        {item.unitLabel ? (
          <>
            <InlineSepDot />
            <span className="text-muted-foreground">{item.unitLabel}</span>
          </>
        ) : null}
      </p>
    </Link>
  );
}
