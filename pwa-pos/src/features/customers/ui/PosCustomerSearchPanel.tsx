"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  Alert,
  Button,
  Dialog,
  DotProgress,
  IconButton,
  NumberStepper,
  TextField,
} from "@kai/ui";
import type {
  PosCustomerSearchRow,
  PosSaleCustomer,
} from "@/features/customers/types/pos-customer.types";
import type { ReactNode } from "react";
import {
  clampPosCustomerSearchPageSize,
  POS_CUSTOMER_SEARCH_DEBOUNCE_MS,
  POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE,
  POS_CUSTOMER_SEARCH_MAX,
  POS_CUSTOMER_SEARCH_MIN,
  readPosCustomerSearchPageSize,
  writePosCustomerSearchPageSize,
} from "@/features/customers/lib/posCustomerSearchStorage";
import { searchPosCustomersAction } from "@/features/customers/actions/customers-pos.action";
import { searchOfflineCustomers } from "@/features/pos-offline/application/search-offline-customers.usecase";
import { touchOfflineCustomerUsed } from "@/features/pos-offline/application/download-customers-snapshot.usecase";

/**
 * URL params controlados por este panel. Se prefijan con `customer*`
 * para no chocar con otros estados de la misma page.
 */
export const POS_CUSTOMER_URL_KEYS = {
  query: "customerQuery",
  page: "customerPage",
  pageSize: "customerPageSize",
  /** Cliente seleccionado para ficha (página Clientes). */
  selectedId: "customerId",
} as const;

export type PosCustomerSearchInitial = {
  query: string;
  page: number;
  pageSize: number;
  items: PosCustomerSearchRow[];
  total: number;
  error: string | null;
};

type Props = {
  initial: PosCustomerSearchInitial;
  selectedCustomer: PosSaleCustomer | null;
  onPick: (row: PosCustomerSearchRow) => void;
  onClearSelected: () => void;
  /** Bloquea selección/limpieza/creación (p. ej. devolución/encargo/cotización vinculada). */
  disabled?: boolean;
  /** Alto del panel respecto al viewport (vh). Por defecto coincide con la columna del payment. */
  heightVh?: number;
  /**
   * `stacked`: al seleccionar cliente, el detalle compacto sustituye la lista (pantalla de cobro).
   * `split`: la lista permanece; el detalle completo vive fuera (página Clientes).
   */
  variant?: "stacked" | "split";
  /** Muestra botón + para creación rápida de cliente. */
  showAddCustomer?: boolean;
  onAddCustomerClick?: () => void;
  /** Contenido extra bajo la ficha del cliente (p. ej. NC y abonos disponibles). */
  paymentSourcesSlot?: ReactNode;
  /** Si se provee, la lista usa estos ítems (búsqueda offline en cliente). */
  offlineItems?: PosCustomerSearchRow[] | null;
  offlineTotal?: number;
  /** Activa búsqueda local IndexedDB (sin navegación URL). */
  offlineMode?: boolean;
  /**
   * Pantallas sin SSR (p. ej. cobro offline-first): resuelve resultados vía
   * server action en cliente cuando cambian los params de URL.
   */
  clientFetchMode?: boolean;
  /** Solo clientes activos (cobro POS). */
  activeOnly?: boolean;
};

/**
 * Buscador de clientes del POS, alineado con el patrón de
 * `PosProductSearchPanel` pero **URL-driven**: la `page` Server
 * Component lee los params (customerQuery / customerPage /
 * customerPageSize) y este componente escribe en la URL ante cambios.
 *
 * Estado:
 *  - `initial.*` proviene del SSR (página Clientes) o es vacío (cobro).
 *  - Con `clientFetchMode`, los resultados se obtienen en cliente vía server action.
 *  - `draftQuery` es el input local con debounce; al asentarse se refleja en la URL.
 *  - `pageSize` se persiste en `localStorage` y se sincroniza con la URL al montar.
 */
export default function PosCustomerSearchPanel({
  initial,
  selectedCustomer,
  onPick,
  onClearSelected,
  disabled = false,
  heightVh = 76,
  variant = "stacked",
  showAddCustomer = false,
  onAddCustomerClick,
  paymentSourcesSlot,
  offlineItems = null,
  offlineTotal,
  offlineMode = false,
  clientFetchMode = false,
  activeOnly = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [draftQuery, setDraftQuery] = useState(initial.query ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateCustomerSearch = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  const urlQuery = (sp.get(POS_CUSTOMER_URL_KEYS.query) ?? "").trim();
  const urlPage = Math.max(
    1,
    parseInt(sp.get(POS_CUSTOMER_URL_KEYS.page) || String(initial.page || 1), 10) || 1,
  );
  const urlPageSize = clampPosCustomerSearchPageSize(
    parseInt(sp.get(POS_CUSTOMER_URL_KEYS.pageSize) || String(initial.pageSize), 10) ||
      initial.pageSize,
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftPageSize, setDraftPageSize] = useState<number>(initial.pageSize);
  const [localOfflineItems, setLocalOfflineItems] = useState<PosCustomerSearchRow[]>([]);
  const [localOfflineTotal, setLocalOfflineTotal] = useState(0);
  const [clientFetchLoading, setClientFetchLoading] = useState(false);
  const [clientFetchSnapshot, setClientFetchSnapshot] = useState<PosCustomerSearchInitial>(() => ({
    query: initial.query ?? "",
    page: initial.page,
    pageSize: initial.pageSize,
    items: initial.items,
    total: initial.total,
    error: initial.error,
  }));

  const useClientFetch = clientFetchMode && !offlineMode;

  const resolvedSearch = useMemo((): PosCustomerSearchInitial => {
    if (offlineMode) {
      return {
        query: draftQuery.trim(),
        page: 1,
        pageSize: initial.pageSize,
        items: localOfflineItems,
        total: localOfflineTotal,
        error: null,
      };
    }
    if (useClientFetch) {
      return clientFetchSnapshot;
    }
    return {
      query: initial.query ?? "",
      page: initial.page,
      pageSize: initial.pageSize,
      items: offlineItems ?? initial.items,
      total: offlineTotal ?? initial.total,
      error: initial.error,
    };
  }, [
    clientFetchSnapshot,
    draftQuery,
    initial,
    localOfflineItems,
    localOfflineTotal,
    offlineItems,
    offlineMode,
    offlineTotal,
    useClientFetch,
  ]);

  const visibleItems = resolvedSearch.items;
  const visibleTotal = resolvedSearch.total;
  const visibleError = resolvedSearch.error;

  // --- Sync draftQuery con la URL externa (back/forward del navegador). ---
  useEffect(() => {
    const externalQuery = useClientFetch ? urlQuery : (initial.query ?? "").trim();
    setDraftQuery((current) => {
      if (current.trim() === externalQuery) return current;
      return externalQuery;
    });
  }, [initial.query, urlQuery, useClientFetch]);

  useEffect(() => {
    if (!useClientFetch) return;
    let cancelled = false;
    setClientFetchLoading(true);
    void searchPosCustomersAction({
      query: urlQuery,
      page: urlPage,
      pageSize: urlPageSize,
      activeOnly: activeOnly || undefined,
    }).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setClientFetchSnapshot({
          query: urlQuery,
          page: res.page || urlPage,
          pageSize: res.pageSize || urlPageSize,
          items: res.customers,
          total: res.total,
          error: null,
        });
      } else {
        setClientFetchSnapshot({
          query: urlQuery,
          page: urlPage,
          pageSize: urlPageSize,
          items: [],
          total: 0,
          error: res.message,
        });
      }
      setClientFetchLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOnly, urlPage, urlPageSize, urlQuery, useClientFetch]);

  // --- Auto-sync de pageSize entre LS ↔ URL al montar. ---
  // Si la URL no trae `customerPageSize` y la preferencia local difiere
  // del default que vino del SSR, redirigimos a la URL canonical.
  const lsSyncedRef = useRef(false);
  useEffect(() => {
    if (lsSyncedRef.current) return;
    lsSyncedRef.current = true;
    const urlExplicit = sp.get(POS_CUSTOMER_URL_KEYS.pageSize);
    if (urlExplicit != null && urlExplicit !== "") return;
    const lsValue = readPosCustomerSearchPageSize();
    if (lsValue !== initial.pageSize) {
      const params = new URLSearchParams(sp.toString());
      params.set(POS_CUSTOMER_URL_KEYS.pageSize, String(lsValue));
      params.set(POS_CUSTOMER_URL_KEYS.page, "1");
      navigateCustomerSearch(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  useEffect(() => {
    if (!offlineMode) return;
    void searchOfflineCustomers("").then((rows) => {
      setLocalOfflineItems(rows);
      setLocalOfflineTotal(rows.length);
    });
  }, [offlineMode]);

  useEffect(() => {
    if (!offlineMode) return;
    if (offlineDebounceRef.current) clearTimeout(offlineDebounceRef.current);
    offlineDebounceRef.current = setTimeout(() => {
      offlineDebounceRef.current = null;
      void searchOfflineCustomers(draftQuery).then((rows) => {
        setLocalOfflineItems(rows);
        setLocalOfflineTotal(rows.length);
      });
    }, POS_CUSTOMER_SEARCH_DEBOUNCE_MS);
    return () => {
      if (offlineDebounceRef.current) clearTimeout(offlineDebounceRef.current);
    };
  }, [draftQuery, offlineMode]);

  // --- Debounced URL update for query. ---
  useEffect(() => {
    if (offlineMode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const next = draftQuery.trim();
      const current = urlQuery;
      if (next === current) return;
      const params = new URLSearchParams(sp.toString());
      if (next) {
        params.set(POS_CUSTOMER_URL_KEYS.query, next);
      } else {
        params.delete(POS_CUSTOMER_URL_KEYS.query);
      }
      params.set(POS_CUSTOMER_URL_KEYS.page, "1");
      navigateCustomerSearch(params);
    }, POS_CUSTOMER_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draftQuery, sp, urlQuery, navigateCustomerSearch]);

  const flushDebouncedSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const next = draftQuery.trim();
    if (next === urlQuery) return;
    const params = new URLSearchParams(sp.toString());
    if (next) {
      params.set(POS_CUSTOMER_URL_KEYS.query, next);
    } else {
      params.delete(POS_CUSTOMER_URL_KEYS.query);
    }
    params.set(POS_CUSTOMER_URL_KEYS.page, "1");
    navigateCustomerSearch(params);
  }, [draftQuery, sp, urlQuery, navigateCustomerSearch]);

  const goToPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(sp.toString());
      params.set(POS_CUSTOMER_URL_KEYS.page, String(Math.max(1, next)));
      navigateCustomerSearch(params);
    },
    [sp, navigateCustomerSearch],
  );

  const openSettings = useCallback(() => {
    setDraftPageSize(initial.pageSize);
    setSettingsOpen(true);
  }, [initial.pageSize]);

  const applySettings = useCallback(() => {
    const nextSize = clampPosCustomerSearchPageSize(draftPageSize);
    writePosCustomerSearchPageSize(nextSize);
    const params = new URLSearchParams(sp.toString());
    params.set(POS_CUSTOMER_URL_KEYS.pageSize, String(nextSize));
    params.set(POS_CUSTOMER_URL_KEYS.page, "1");
    setSettingsOpen(false);
    navigateCustomerSearch(params);
  }, [draftPageSize, sp, navigateCustomerSearch]);

  const totalPages = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil((visibleTotal || 0) / Math.max(1, resolvedSearch.pageSize)) || 1,
      ),
    [resolvedSearch.pageSize, visibleTotal],
  );

  const queryPending = offlineMode ? false : draftQuery.trim() !== urlQuery;
  const resultsPending = offlineMode
    ? false
    : useClientFetch
      ? clientFetchLoading ||
        urlQuery !== (clientFetchSnapshot.query ?? "").trim() ||
        urlPage !== clientFetchSnapshot.page ||
        urlPageSize !== clientFetchSnapshot.pageSize
      : urlQuery !== (initial.query ?? "").trim() ||
        urlPage !== initial.page ||
        urlPageSize !== initial.pageSize;
  const showLoading = isPending || queryPending || resultsPending;

  const hasResults = visibleItems.length > 0;
  const queryLen = draftQuery.trim().length;
  const noMatches = !showLoading && hasResults === false && queryLen >= 2 && !visibleError;

  // ─── Modo DETALLE embebido (sólo pantalla de cobro) ───────────────────────
  if (variant === "stacked" && selectedCustomer) {
    const documentLine = selectedCustomer.document?.trim() || "";
    const phoneLine = selectedCustomer.phone?.trim() || "";
    const emailLine = selectedCustomer.email?.trim() || "";
    const originLabel = selectedCustomer.customerId
      ? "Cliente registrado"
      : "Datos para comprobante";

    return (
      <aside
        className="flex min-h-0 w-full min-w-0 flex-col gap-3 self-stretch rounded-xl border border-border bg-background p-4"
        style={{ height: `${heightVh}vh`, minHeight: `${heightVh}vh` }}
        aria-label="Detalle del cliente seleccionado"
        data-test-id="pos-customer-search-panel-detail"
      >
        <div className="shrink-0 flex w-full items-center gap-2">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="sm"
            ariaLabel="Volver a la búsqueda y limpiar selección"
            title="Volver a la búsqueda"
            onClick={onClearSelected}
            disabled={disabled}
            data-test-id="pos-customer-search-detail-back"
          />
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-foreground">Cliente</h2>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto"
          data-test-id="pos-customer-search-detail-content"
        >
          <article
            className="rounded-xl border border-primary/40 bg-primary/5 p-4 shadow-sm"
            data-test-id="pos-customer-search-detail-card"
          >
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="wrap-break-word text-base font-semibold text-foreground"
                  data-test-id="pos-customer-search-detail-name"
                >
                  {selectedCustomer.name?.trim() || "Cliente"}
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {originLabel}
                </p>
              </div>
            </header>

            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Documento</dt>
                <dd
                  className="break-all font-mono text-foreground"
                  data-test-id="pos-customer-search-detail-document"
                >
                  {documentLine || "—"}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Teléfono</dt>
                <dd
                  className="break-all text-foreground"
                  data-test-id="pos-customer-search-detail-phone"
                >
                  {phoneLine || "—"}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd
                  className="break-all text-foreground"
                  data-test-id="pos-customer-search-detail-email"
                >
                  {emailLine || "—"}
                </dd>
              </div>
            </dl>
          </article>

          {paymentSourcesSlot ? (
            <div className="mt-4 border-t border-border pt-4">{paymentSourcesSlot}</div>
          ) : null}
        </div>
      </aside>
    );
  }

  // ─── Modo BÚSQUEDA: lista de resultados con cards estilo "producto" ─────
  return (
    <aside
      className="flex min-h-0 w-full min-w-0 flex-col gap-3 self-stretch rounded-xl border border-border bg-background p-4"
      style={{ height: `${heightVh}vh`, minHeight: `${heightVh}vh` }}
      aria-label="Buscador de clientes"
      data-test-id="pos-customer-search-panel"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {showAddCustomer && onAddCustomerClick ? (
            <IconButton
              icon="Plus"
              variant="action"
              size="sm"
              className="shrink-0"
              ariaLabel="Crear cliente"
              title="Crear cliente"
              onClick={onAddCustomerClick}
              disabled={disabled}
              data-test-id="pos-customer-search-add-customer"
            />
          ) : null}
          <h2 className="text-sm font-semibold text-foreground">Cliente</h2>
        </div>
        {showLoading ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
            data-test-id="pos-customer-search-pending"
          >
            <DotProgress />
          </span>
        ) : null}
      </div>

      <TextField
        label="Buscar cliente"
        name="pos-customer-search"
        value={draftQuery}
        onChange={(e) => setDraftQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            flushDebouncedSearch();
          } else if (e.key === "Escape") {
            setDraftQuery("");
          }
        }}
        placeholder="Nombre, RUT o teléfono…"
        alwaysShowLabel
        startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
        data-test-id="pos-customer-search-field"
        aria-busy={showLoading}
      />

      {visibleError ? (
        <Alert variant="error" className="py-2 text-sm">
          {visibleError}
        </Alert>
      ) : null}

      {/* Contenedor sin padding: las cards (estilo PosProductSearchPanel)
          se encargan de su propio padding y espaciado vertical. */}
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto"
        style={{ minHeight: `calc(${heightVh}vh - 11rem)` }}
        aria-busy={showLoading}
        data-test-id="pos-customer-search-results"
      >
        {!hasResults && !visibleError && queryLen < 2 ? (
          <p className="text-sm text-muted-foreground">
            Escribe al menos 2 caracteres para buscar (nombre, RUT o teléfono).
          </p>
        ) : null}

        {noMatches ? (
          <p className="text-sm text-muted-foreground">
            Sin coincidencias. Prueba otro término.
          </p>
        ) : null}

        {hasResults
          ? visibleItems.map((row) => {
              const detailBits = [row.documentNumber, row.phone, row.email]
                .map((s) => (s ?? "").trim())
                .filter((s) => s.length > 0);
              const picked =
                variant === "split" &&
                selectedCustomer?.customerId &&
                selectedCustomer.customerId === row.customerId;
              return (
                <button
                  key={row.customerId}
                  type="button"
                  onClick={() => {
                    if (offlineMode) {
                      void touchOfflineCustomerUsed(row.customerId);
                    }
                    onPick(row);
                  }}
                  disabled={disabled}
                  className={`block w-full rounded-xl border bg-surface p-3 text-left shadow-sm transition-colors focus:outline-none ${
                    picked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border"
                  } ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary/40 hover:bg-primary/5 focus:border-primary/40 active:bg-primary/10"}`}
                  data-test-id={`pos-customer-search-pick-${row.customerId}`}
                >
                  <p className="text-sm font-medium text-foreground">
                    {row.displayName?.trim() || "Sin nombre"}
                  </p>
                  <p className="mt-0.5 wrap-break-word text-[11px] text-muted-foreground">
                    {detailBits.length > 0
                      ? detailBits.join(" · ")
                      : "Sin documento / teléfono / email"}
                  </p>
                </button>
              );
            })
          : null}
      </div>

      <div className="shrink-0 flex items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <IconButton
            icon="Settings"
            variant="action"
            size="sm"
            title="Configuración del buscador"
            ariaLabel="Abrir configuración del buscador de clientes"
            onClick={openSettings}
            data-test-id="pos-customer-search-settings"
          />
          <span className="truncate text-xs text-muted-foreground">
            Pág. {resolvedSearch.page} / {totalPages} ({resolvedSearch.total} clientes)
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton
            icon="ChevronLeft"
            variant="action"
            size="sm"
            disabled={resolvedSearch.page <= 1 || showLoading || offlineMode}
            title="Anterior"
            ariaLabel="Página anterior"
            onClick={() => goToPage(resolvedSearch.page - 1)}
            data-test-id="pos-customer-search-prev"
          />
          <IconButton
            icon="ChevronRight"
            variant="action"
            size="sm"
            disabled={resolvedSearch.page >= totalPages || showLoading || offlineMode}
            title="Siguiente"
            ariaLabel="Página siguiente"
            onClick={() => goToPage(resolvedSearch.page + 1)}
            data-test-id="pos-customer-search-next"
          />
        </div>
      </div>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Configuración del buscador"
        size="sm"
        data-test-id="pos-customer-search-settings-dialog"
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
          <NumberStepper
            label="Resultados por página"
            value={draftPageSize}
            onChange={(v) => setDraftPageSize(clampPosCustomerSearchPageSize(v))}
            min={POS_CUSTOMER_SEARCH_MIN}
            max={POS_CUSTOMER_SEARCH_MAX}
            step={1}
            allowNegative={false}
            data-test-id="pos-customer-search-page-size"
          />
          <p className="text-xs text-muted-foreground">
            Default: {POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE}. Se guarda en
            este dispositivo y también queda reflejado en la URL para
            compartir vínculos.
          </p>
        </div>
      </Dialog>
    </aside>
  );
}
