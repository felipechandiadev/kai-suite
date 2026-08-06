"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Badge, DotProgress, IconButton, TextField } from "@kai/ui";
import {
  addOrderItemsAction,
  batchWaiterCtpAction,
  getDiningNumberingSettingsAction,
  resolveWaiterBranchCatalogContextAction,
  searchWaiterMenuAction,
} from "../actions/waiter.action";
import type {
  DiningOrderDto,
  WaiterMenuCategoryDto,
  WaiterMenuVariantDto,
} from "../infrastructure/dining.request";
import { WaiterProductNameWithAttributes } from "./WaiterProductNameWithAttributes";
import type { WaiterSession } from "@/lib/app-session";
import {
  isWaiterAccountUnavailableError,
  messageFromUnknownError,
  WAITER_ACCOUNT_UNAVAILABLE_MSG,
} from "../lib/waiter-account-unavailable";

const SEARCH_DEBOUNCE_MS = 280;
const PAGE_SIZE = 24;
const CATEGORY_STORAGE_PREFIX = "kai-waiter-menu-cats:";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function readActiveCategoryIds(branchId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${CATEGORY_STORAGE_PREFIX}${branchId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeActiveCategoryIds(branchId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${CATEGORY_STORAGE_PREFIX}${branchId}`,
    JSON.stringify(ids),
  );
}

type WaiterMenuPanelProps = {
  session: WaiterSession;
  branchId: string;
  orderId: string;
  onOrderUpdated: (order: DiningOrderDto) => void;
  onAccountUnavailable: (message: string) => void;
};

export function WaiterMenuPanel({
  session,
  branchId,
  orderId,
  onOrderUpdated,
  onAccountUnavailable,
}: WaiterMenuPanelProps) {
  const [draftSearch, setDraftSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<WaiterMenuVariantDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priceListId, setPriceListId] = useState<string | null>(null);
  const [pointOfSaleId, setPointOfSaleId] = useState<string | null>(null);
  const [menuCategories, setMenuCategories] = useState<WaiterMenuCategoryDto[]>(
    [],
  );
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
  const [ctpByVariantId, setCtpByVariantId] = useState<
    Record<string, number | null>
  >({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auth = useMemo(
    () => ({ userId: session.userId, companyId: session.companyId }),
    [session.userId, session.companyId],
  );

  useEffect(() => {
    const bid = branchId.trim();
    if (!bid) return;
    let cancelled = false;
    void (async () => {
      try {
        const [ctx, settings] = await Promise.all([
          resolveWaiterBranchCatalogContextAction({ ...auth, branchId: bid }),
          getDiningNumberingSettingsAction({ ...auth, branchId: bid }),
        ]);
        if (cancelled) return;
        setPriceListId(ctx.priceListId);
        setPointOfSaleId(ctx.pointOfSaleId);
        const cats = settings.posAccountsMenuCategories ?? [];
        const allowed = new Set(cats.map((c) => c.id));
        const stored = readActiveCategoryIds(bid).filter((id) => allowed.has(id));
        setMenuCategories(cats);
        setActiveCategoryIds(stored);
        if (!ctx.priceListId) {
          setError(
            "No hay lista de precios en un POS de esta sucursal. Configurá un POS en admin.",
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar menú");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, branchId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setSearchQuery(draftSearch.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draftSearch]);

  /** Sin badge activo = todo el menú (onMenu); categorías configuradas solo definen badges. */
  const searchCategoryIds = useMemo(() => {
    if (activeCategoryIds.length > 0) return activeCategoryIds;
    return undefined;
  }, [activeCategoryIds]);

  const load = useCallback(async () => {
    const pl = priceListId?.trim();
    if (!pl) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchWaiterMenuAction({
        ...auth,
        priceListId: pl,
        branchId: branchId.trim() || undefined,
        pointOfSaleId,
        query: searchQuery || undefined,
        categoryIds: searchCategoryIds,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(res.products);
      setTotal(res.total);
      if (branchId.trim() && res.products.length > 0) {
        try {
          const ctp = await batchWaiterCtpAction({
            ...auth,
            branchId: branchId.trim(),
            variantIds: res.products.map((p) => p.variantId),
          });
          const next: Record<string, number | null> = {};
          for (const row of ctp) {
            next[row.variantId] = row.producibleQty;
          }
          setCtpByVariantId(next);
        } catch {
          setCtpByVariantId({});
        }
      } else {
        setCtpByVariantId({});
      }
    } catch (e) {
      setItems([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : "Error al buscar");
    } finally {
      setLoading(false);
    }
  }, [
    auth,
    branchId,
    page,
    pointOfSaleId,
    priceListId,
    searchCategoryIds,
    searchQuery,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleCategory = (id: string) => {
    setActiveCategoryIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      const bid = branchId.trim();
      if (bid) writeActiveCategoryIds(bid, next);
      return next;
    });
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleAdd = async (item: WaiterMenuVariantDto) => {
    setAddingId(item.variantId);
    setError(null);
    try {
      const updated = await addOrderItemsAction({
        ...auth,
        orderId,
        productVariantId: item.variantId,
        quantity: 1,
      });
      onOrderUpdated(updated);
    } catch (e) {
      const msg = messageFromUnknownError(e, "No se pudo agregar");
      if (isWaiterAccountUnavailableError(msg)) {
        onAccountUnavailable(WAITER_ACCOUNT_UNAVAILABLE_MSG);
        return;
      }
      setError(msg);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="waiter-menu-panel">
      {menuCategories.length > 0 ? (
        <div
          className="flex flex-wrap gap-1.5"
          data-test-id="waiter-menu-category-badges"
        >
          {menuCategories.map((cat) => {
            const active = activeCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                data-test-id={`waiter-menu-category-${cat.id}`}
              >
                <Badge variant={active ? "secondary" : "secondary-outlined"}>
                  {cat.name}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : null}

      <TextField
        label="Buscar producto"
        name="waiter-menu-search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        placeholder="Nombre, SKU o código…"
        alwaysShowLabel
        startAdornment={
          <Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />
        }
        data-test-id="waiter-menu-search"
      />

      {error ? (
        <p className="text-sm text-red-500" data-test-id="waiter-menu-error">
          {error}
        </p>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        aria-busy={loading}
        data-test-id="waiter-menu-list"
      >
        {loading && items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <DotProgress />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin productos en este filtro.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const busy = addingId === item.variantId;
              const isPreparado =
                String(item.productType ?? "").toUpperCase() === "PREPARADO";
              const cap = ctpByVariantId[item.variantId];
              const showCap = cap != null;
              const ctpBlocked = cap === 0;
              const stockBlocked =
                !isPreparado &&
                !showCap &&
                Boolean(item.trackInventory) &&
                item.availableStock != null &&
                item.availableStock <= 0;
              const blocked = ctpBlocked || stockBlocked;
              return (
                <div
                  key={item.variantId}
                  className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 ${
                    blocked
                      ? "border-red-300/60 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                      : "border-border bg-surface"
                  }`}
                  data-test-id={`waiter-menu-card-${item.variantId}`}
                >
                  <div className="min-w-0 flex-1 text-left text-sm">
                    <WaiterProductNameWithAttributes
                      name={item.productName}
                      attributes={item.attributes}
                      className="min-w-0 break-words text-sm font-medium leading-snug text-foreground"
                    />
                    <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
                      SKU {item.sku ?? "—"}
                      {item.barcode?.trim() ? ` · ${item.barcode.trim()}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs tabular-nums text-foreground">
                      <span className="font-semibold">
                        {formatMoney(item.unitPriceWithTax || item.unitPrice)}
                      </span>
                      {item.saleUnitSymbol ? (
                        <span className="text-muted-foreground">
                          · {item.saleUnitSymbol}
                        </span>
                      ) : null}
                      {showCap ? (
                        <span
                          className={
                            ctpBlocked
                              ? "rounded border border-red-300 px-1.5 py-0.5 text-[11px] font-medium text-red-700"
                              : "rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                          }
                          data-test-id={`waiter-menu-cap-${item.variantId}`}
                        >
                          Cap. {cap}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <IconButton
                    icon="Plus"
                    variant="outlined"
                    size="sm"
                    ariaLabel={
                      blocked
                        ? `Sin disponibilidad: ${item.productName}`
                        : `Agregar ${item.productName}`
                    }
                    disabled={blocked || busy || addingId !== null}
                    isLoading={busy}
                    onClick={() => void handleAdd(item)}
                    data-test-id={`waiter-menu-add-${item.variantId}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-2">
          <IconButton
            icon="ChevronLeft"
            variant="action"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            ariaLabel="Página anterior"
          />
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <IconButton
            icon="ChevronRight"
            variant="action"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            ariaLabel="Página siguiente"
          />
        </div>
      ) : null}
    </div>
  );
}
