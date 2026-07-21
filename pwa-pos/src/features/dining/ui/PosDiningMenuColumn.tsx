"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { DotProgress, IconButton, TextField } from "@kai/ui";
import { addPosDiningOrderItemsAction, batchPosDiningCtpAction } from "@/features/dining/actions/dining-pos.action";
import type {
  PosDiningMenuGroup,
  PosDiningOrderSummary,
} from "@/features/dining/types/dining-pos.types";
import { useDiningCtpStockSubscription } from "@/features/dining/lib/use-dining-ctp-stock-subscription";
import { useDiningMenuCtpInvalidateOnSession } from "@/features/dining/lib/use-dining-menu-ctp-invalidate";
import { useCatalogRealtime } from "@/features/pos-catalog/realtime/catalog-realtime-context";
import { PosDiningMenuVariantInfoDialog } from "@/features/dining/ui/PosDiningMenuVariantInfoDialog";
import {
  lookupPosVariantsAction,
  searchPosProductsAction,
} from "@/features/pos-products/actions/pos-products.action";
import {
  POS_PRODUCT_SEARCH_DEBOUNCE_MS,
  POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE,
  readPosProductSearchPageSize,
} from "@/features/pos-products/lib/posProductSearchStorage";
import { POS_INSUFFICIENT_STOCK_SURFACE_CLASS } from "@/features/pos-products/ui/posProductPreview";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import {
  formatMoney,
  posDisplaySaleUnitSymbol,
  posFormatStockQuantity,
  posResolveAvailableStockInSaleUnits,
  PosProductNameWithAttributes,
} from "@/features/pos-products/ui/posProductPreview";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";

const GROUP_PRODUCT_TYPES: Record<PosDiningMenuGroup, string[]> = {
  preparados: ["PREPARADO"],
  fisicos: ["PHYSICAL", "ELABORADO", "MANUFACTURADO"],
};

type Props = {
  orderId: string | null;
  disabled?: boolean;
  heightVh?: number;
  fillViewport?: boolean;
  onOrderUpdated: (order: PosDiningOrderSummary) => void;
};

export function PosDiningMenuColumn({
  orderId,
  disabled = false,
  heightVh = 78,
  fillViewport = false,
  onOrderUpdated,
}: Props) {
  const [group, setGroup] = useState<PosDiningMenuGroup>("preparados");
  const [draftSearch, setDraftSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchCommittedRef = useRef("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE);
  const [items, setItems] = useState<PosProductSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoItem, setInfoItem] = useState<PosProductSearchItem | null>(null);
  const [ctpByVariantId, setCtpByVariantId] = useState<
    Record<string, number | null>
  >({});
  const [ctpStorageIds, setCtpStorageIds] = useState<string[]>([]);
  const [posStorageId, setPosStorageId] = useState("");
  const [branchId, setBranchId] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const refreshCtp = useCallback(async (products: PosProductSearchItem[]) => {
    const ctx = readPosContextClient();
    const bid = ctx?.branchId?.trim() ?? "";
    if (!bid || products.length === 0) {
      setCtpByVariantId({});
      setCtpStorageIds([]);
      return;
    }
    const res = await batchPosDiningCtpAction({
      branchId: bid,
      variantIds: products.map((p) => p.variantId),
    });
    if (!res.success) {
      setCtpByVariantId({});
      setCtpStorageIds([]);
      return;
    }
    const next: Record<string, number | null> = {};
    const storages = new Set<string>();
    for (const row of res.results) {
      next[row.variantId] = row.producibleQty;
      if (row.inputStorageId) storages.add(row.inputStorageId);
    }
    setCtpByVariantId(next);
    setCtpStorageIds([...storages]);
  }, []);

  const refreshStockFields = useCallback(async (products: PosProductSearchItem[]) => {
    if (products.length === 0) return;
    const ctx = readPosContextClient();
    const res = await lookupPosVariantsAction({
      variantIds: products.map((p) => p.variantId),
      branchId: ctx?.branchId ?? null,
      pointOfSaleId: ctx?.pointOfSaleId ?? null,
      priceListId: ctx?.priceListId ?? null,
    });
    if (!res.success) return;
    const byId = new Map(res.products.map((p) => [p.variantId, p]));
    setItems((prev) =>
      prev.map((item) => {
        const fresh = byId.get(item.variantId);
        if (!fresh) return item;
        return {
          ...item,
          availableStock: fresh.availableStock,
          availableStockBase: fresh.availableStockBase,
          stockBaseQtyPerCountSaleUnit: fresh.stockBaseQtyPerCountSaleUnit,
          unitPrice: fresh.unitPrice,
          unitPriceWithTax: fresh.unitPriceWithTax,
          unitTaxAmount: fresh.unitTaxAmount,
          unitTaxRate: fresh.unitTaxRate,
        };
      }),
    );
    setInfoItem((prev) => {
      if (!prev) return prev;
      const fresh = byId.get(prev.variantId);
      if (!fresh) return prev;
      return {
        ...prev,
        availableStock: fresh.availableStock,
        availableStockBase: fresh.availableStockBase,
        stockBaseQtyPerCountSaleUnit: fresh.stockBaseQtyPerCountSaleUnit,
      };
    });
  }, []);

  /** CTP + stock físico de las cards visibles (tras WS stock / dining). */
  const refreshLiveMenuData = useCallback(() => {
    const products = itemsRef.current;
    if (products.length === 0) return;
    void refreshCtp(products);
    void refreshStockFields(products);
  }, [refreshCtp, refreshStockFields]);

  useEffect(() => {
    setPageSize(readPosProductSearchPageSize());
    const ctx = readPosContextClient();
    setPosStorageId(ctx?.storageId?.trim() ?? "");
    setBranchId(ctx?.branchId?.trim() ?? "");
  }, []);

  useEffect(() => {
    searchCommittedRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const next = draftSearch.trim();
      if (next === searchCommittedRef.current.trim()) return;
      setSearchQuery(draftSearch);
      setPage(1);
    }, POS_PRODUCT_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draftSearch]);

  useEffect(() => {
    setPage(1);
  }, [group]);

  const load = useCallback(async () => {
    const ctx = readPosContextClient();
    setPosStorageId(ctx?.storageId?.trim() ?? "");
    setBranchId(ctx?.branchId?.trim() ?? "");
    const priceListId = ctx?.priceListId?.trim() ?? "";
    if (!priceListId) {
      setError("Lista de precios no configurada en el POS.");
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await searchPosProductsAction({
      query: searchQuery.trim() || undefined,
      priceListId,
      branchId: ctx?.branchId ?? null,
      pointOfSaleId: ctx?.pointOfSaleId ?? null,
      productTypes: GROUP_PRODUCT_TYPES[group],
      page,
      pageSize,
    });
    setLoading(false);
    if (!res.success) {
      if (redirectToLoginIfUnauthorized(res)) return;
      setError(res.message);
      setItems([]);
      setTotal(0);
      return;
    }
    setItems(res.products);
    setTotal(res.pagination.total);
    void refreshCtp(res.products);
  }, [group, page, pageSize, searchQuery, refreshCtp]);

  useEffect(() => {
    void load();
  }, [load]);

  const stockSubscribeIds = useMemo(() => {
    const ids = new Set(ctpStorageIds);
    if (posStorageId) ids.add(posStorageId);
    return [...ids];
  }, [ctpStorageIds, posStorageId]);

  useDiningCtpStockSubscription(stockSubscribeIds, refreshLiveMenuData, {
    enabled: !disabled && stockSubscribeIds.length > 0,
  });

  useDiningMenuCtpInvalidateOnSession(branchId, refreshLiveMenuData, {
    enabled: !disabled && Boolean(branchId),
  });

  const { registerCatalogRefresh } = useCatalogRealtime();
  useEffect(() => {
    return registerCatalogRefresh((payload) => {
      const kinds = new Set(payload.kinds);
      if (kinds.has("RECIPE") && !kinds.has("PRICE") && !kinds.has("PRODUCT") && !kinds.has("VARIANT")) {
        void refreshCtp(itemsRef.current);
        return;
      }
      if (kinds.has("PRICE") || kinds.has("PRODUCT") || kinds.has("VARIANT") || kinds.has("RECIPE")) {
        void load();
      }
    });
  }, [registerCatalogRefresh, refreshCtp, load]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, pageSize))),
    [pageSize, total],
  );

  const handleAdd = (item: PosProductSearchItem) => {
    if (!orderId || disabled) return;
    setAddingId(item.variantId);
    setError(null);
    void addPosDiningOrderItemsAction(orderId, [
      { productVariantId: item.variantId, quantity: 1 },
    ]).then((res) => {
      setAddingId(null);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setError(res.message);
        return;
      }
      onOrderUpdated(res.order);
      // Stock/CTP pueden cambiar al agregar (reserva aún no; Cap sigue igual hasta fire).
    });
  };

  return (
    <aside
      className={`flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 ${
        fillViewport ? "h-full min-h-0" : ""
      }`}
      style={
        fillViewport
          ? undefined
          : { height: `${heightVh}vh`, minHeight: `${heightVh}vh` }
      }
      aria-label="Menú"
      data-test-id="pos-dining-menu-column"
    >
      <div
        className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
        aria-label="Tipo de producto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={group === "preparados"}
          disabled={disabled}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            group === "preparados"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
          onClick={() => setGroup("preparados")}
          data-test-id="pos-dining-menu-tab-preparados"
        >
          Menú
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={group === "fisicos"}
          disabled={disabled}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            group === "fisicos"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
          onClick={() => setGroup("fisicos")}
          data-test-id="pos-dining-menu-tab-fisicos"
        >
          Productos
        </button>
      </div>

      <TextField
        label="Buscar producto"
        name="pos-dining-menu-search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        placeholder="Nombre, SKU o código…"
        alwaysShowLabel
        disabled={disabled}
        startAdornment={
          <Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />
        }
        data-test-id="pos-dining-menu-search"
      />

      {!orderId ? (
        <p className="text-xs text-muted-foreground">
          Seleccioná una cuenta a la izquierda para agregar ítems.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        aria-busy={loading}
        data-test-id="pos-dining-menu-list"
      >
        {loading && items.length === 0 ? (
          <div
            className="flex flex-1 items-center justify-center py-10"
            data-test-id="pos-dining-menu-list-loading"
          >
            <DotProgress />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin productos en este filtro.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const busy = addingId === item.variantId;
              const saleUnit = posDisplaySaleUnitSymbol(item);
              const cap = ctpByVariantId[item.variantId];
              const showCap = cap != null;
              const ctpBlocked = cap === 0;
              const stockLabel = item.trackInventory
                ? posFormatStockQuantity(item)
                : null;
              const stockQty = posResolveAvailableStockInSaleUnits(item);
              const stockBlocked =
                !showCap &&
                item.trackInventory &&
                stockQty != null &&
                stockQty <= 0;
              const blocked = ctpBlocked || stockBlocked;
              const canAdd = Boolean(orderId) && !disabled && !blocked;
              return (
                <div
                  key={item.variantId}
                  className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 ${
                    blocked
                      ? POS_INSUFFICIENT_STOCK_SURFACE_CLASS
                      : "border-border bg-surface"
                  }`}
                  data-test-id={`pos-dining-menu-card-${item.variantId}`}
                  data-ctp-blocked={ctpBlocked ? "true" : undefined}
                  data-stock-blocked={stockBlocked ? "true" : undefined}
                >
                  <div className="min-w-0 flex-1 text-left text-sm">
                    <div className="min-w-0 font-medium text-foreground">
                      <PosProductNameWithAttributes
                        name={item.productName}
                        attributes={item.attributes}
                        className="min-w-0 break-words text-sm font-medium leading-snug text-foreground"
                      />
                    </div>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
                      SKU {item.sku ?? "—"}
                      {item.barcode?.trim() ? ` · ${item.barcode.trim()}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs tabular-nums text-foreground">
                      <span className="font-semibold">{formatMoney(item.unitPriceWithTax)}</span>
                      {saleUnit ? (
                        <span className="text-muted-foreground">· {saleUnit}</span>
                      ) : null}
                      {showCap ? (
                        <span
                          className={
                            ctpBlocked
                              ? "rounded border border-red-300 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:border-red-800 dark:text-red-300"
                              : "rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                          }
                          data-test-id={`pos-dining-menu-cap-${item.variantId}`}
                          title={
                            ctpBlocked
                              ? "CTP Hard Block: sin capacidad producible"
                              : "Capacidad producible (CTP)"
                          }
                        >
                          Cap. {cap}
                        </span>
                      ) : null}
                      {stockLabel != null ? (
                        <span
                          className={
                            stockBlocked
                              ? "rounded border border-red-300 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:border-red-800 dark:text-red-300"
                              : "rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                          }
                          data-test-id={`pos-dining-menu-stock-${item.variantId}`}
                          title="Stock disponible (sala POS)"
                        >
                          Stock {stockLabel}
                          {saleUnit ? ` ${saleUnit}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className="flex shrink-0 items-start gap-1"
                    data-test-id={`pos-dining-menu-card-actions-${item.variantId}`}
                  >
                    <IconButton
                      icon="Info"
                      variant="outlined"
                      size="sm"
                      ariaLabel={`Ver información de ${item.productName}`}
                      title="Información"
                      disabled={disabled}
                      onClick={() => setInfoItem(item)}
                      data-test-id={`pos-dining-menu-info-${item.variantId}`}
                    />
                    <IconButton
                      icon="Plus"
                      variant="outlined"
                      size="sm"
                      ariaLabel={
                        ctpBlocked
                          ? `Sin capacidad producible: ${item.productName}`
                          : stockBlocked
                            ? `Sin stock: ${item.productName}`
                            : canAdd
                              ? `Agregar ${item.productName} a la cuenta`
                              : "Seleccioná una cuenta para agregar"
                      }
                      title={
                        ctpBlocked
                          ? "Sin capacidad producible"
                          : stockBlocked
                            ? "Sin stock"
                            : canAdd
                              ? "Agregar a la cuenta"
                              : "Seleccioná una cuenta"
                      }
                      disabled={!canAdd || busy || addingId !== null}
                      isLoading={busy}
                      onClick={() => handleAdd(item)}
                      data-test-id={`pos-dining-menu-add-${item.variantId}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-2">
        <span className="truncate text-xs text-muted-foreground">
          Pág. {page} / {totalPages} ({total} productos)
          {loading ? " · …" : ""}
        </span>
        <div className="flex shrink-0 gap-1">
          <IconButton
            icon="ChevronLeft"
            variant="action"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            ariaLabel="Página anterior"
            data-test-id="pos-dining-menu-prev-page"
          />
          <IconButton
            icon="ChevronRight"
            variant="action"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            ariaLabel="Página siguiente"
            data-test-id="pos-dining-menu-next-page"
          />
        </div>
      </div>

      <PosDiningMenuVariantInfoDialog
        open={infoItem != null}
        onClose={() => setInfoItem(null)}
        item={infoItem}
        initialProducibleQty={
          infoItem != null ? (ctpByVariantId[infoItem.variantId] ?? null) : null
        }
      />
    </aside>
  );
}
