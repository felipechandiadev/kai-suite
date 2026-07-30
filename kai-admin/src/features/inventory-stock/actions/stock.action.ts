"use server";

import { revalidatePath } from "next/cache";
import { updateProductVariantInventoryPartialAction } from "@/features/inventory-products/actions/product.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { InventoryRequest } from "../infrastructure/inventory.request";
import { mergeStoragesForThresholds } from "../lib/variant-stock-threshold-config";
import { buildVariantStockBalanceChart } from "../lib/variant-stock-balance-chart";
import type { StockMovementRow } from "../types/stock-grid.types";
import type {
  ListStockForGridInput,
  ListStockForGridResult,
  ListStockMovementsResult,
  StockStorageBreakdownRow,
} from "../types/stock-grid.types";
import type { StockBalanceChartMeta, StockBalanceChartSeriesLine } from "../lib/variant-stock-balance-chart";
import type { StockGridRow } from "../types/stock-grid.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";

const STOCK_PATH = "/inventory/stock";
const PRODUCT_VARIANT_DETAIL_PATH_PREFIX = "/catalog/products/variants";

function revalidateStockRoute() {
  revalidatePath(STOCK_PATH, "page");
  // Invalida layouts del segmento para que `router.refresh()` reciba RSC nuevo (no solo caché de página aislada).
  revalidatePath(STOCK_PATH, "layout");
}

function revalidateVariantDetailRoute(variantId: string) {
  revalidatePath(`${PRODUCT_VARIANT_DETAIL_PATH_PREFIX}/${encodeURIComponent(variantId)}`, "page");
}

export type FetchVariantStockBreakdownResult =
  | { ok: true; breakdown: StockStorageBreakdownRow[]; stockRow: StockGridRow | null }
  | { ok: false; error: string };

/** Misma fuente que el grid de stock: búsqueda inventario + catálogo de almacenes. */
export async function fetchVariantStockBreakdownAction(input: {
  variantId: string;
  sku: string;
}): Promise<FetchVariantStockBreakdownResult> {
  const variantId = input.variantId?.trim() ?? "";
  const sku = input.sku?.trim() ?? "";
  if (!variantId) {
    return { ok: false, error: "Variante no válida" };
  }
  try {
    const [storages, grid] = await Promise.all([
      listStoragesForPage(),
      InventoryRequest.search({
        search: sku || undefined,
        page: 1,
        limit: 25,
        sortField: "sku",
        sort: "asc",
      }),
    ]);
    const row =
      grid.rows.find((r) => r.variantId === variantId) ??
      (grid.rows.length === 1 ? grid.rows[0] : null);
    const breakdown = mergeStoragesForThresholds(storages, row?.storageBreakdown ?? []);
    return { ok: true, breakdown, stockRow: row };
  } catch (e) {
    const err = e instanceof Error ? e.message : "Error al cargar configuración por almacén";
    return { ok: false, error: err };
  }
}

export async function saveVariantStorageThresholdsAction(input: {
  variantId: string;
  storageThresholds: Array<{
    storageId: string;
    minimumStock: number | null;
    minimumStockEnabled: boolean | null;
    maximumStock: number | null;
    maximumStockEnabled: boolean | null;
    reorderPoint: number | null;
    reorderPointEnabled: boolean | null;
  }>;
}): Promise<{ success: true } | { success: false; error: string }> {
  const variantId = input.variantId.trim();
  if (!variantId) {
    return { success: false, error: "Variante no válida" };
  }

  for (const st of input.storageThresholds) {
    const r = await InventoryRequest.updateStockLevelThresholds({
      productVariantId: variantId,
      storageId: st.storageId.trim(),
      minimumStock: st.minimumStock,
      minimumStockEnabled: st.minimumStockEnabled,
      maximumStock: st.maximumStock,
      maximumStockEnabled: st.maximumStockEnabled,
      reorderPoint: st.reorderPoint,
      reorderPointEnabled: st.reorderPointEnabled,
    });
    if (!r.success) {
      return r;
    }
  }

  revalidateStockRoute();
  revalidateVariantDetailRoute(variantId);
  return { success: true };
}

const CHART_MOVEMENTS_PAGE_LIMIT = 200;
const CHART_MAX_PAGES_PER_STORAGE = 2;

export type VariantStockBalanceChartData = {
  breakdown: StockStorageBreakdownRow[];
  seriesLines: StockBalanceChartSeriesLine[];
  meta: StockBalanceChartMeta | null;
  unitLabel: string | null;
  stockRow: StockGridRow | null;
  storages: StorageListItem[];
};

export type FetchVariantStockBalanceChartResult =
  | { ok: true; data: VariantStockBalanceChartData }
  | { ok: false; error: string };

/** Movimientos por almacén (misma API que el grid de stock) para saldo histórico. */
export async function fetchVariantStockBalanceChartAction(input: {
  variantId: string;
  sku: string;
}): Promise<FetchVariantStockBalanceChartResult> {
  const variantId = input.variantId?.trim() ?? "";
  const sku = input.sku?.trim() ?? "";
  if (!variantId) {
    return { ok: false, error: "Variante no válida" };
  }

  try {
    const breakdownRes = await fetchVariantStockBreakdownAction({ variantId, sku });
    if (!breakdownRes.ok) {
      return { ok: false, error: breakdownRes.error };
    }

    const breakdown = breakdownRes.breakdown;
    const storagesData: Array<{
      storageId: string;
      storageName: string;
      quantity: number;
      movements: StockMovementRow[];
      movementsTotal: number;
    }> = [];

    for (const b of breakdown) {
      const collected: StockMovementRow[] = [];
      let total = 0;
      let page = 1;

      while (page <= CHART_MAX_PAGES_PER_STORAGE) {
        const pageRes = await InventoryRequest.listStockMovements({
          variantId,
          storageId: b.storageId,
          page,
          limit: CHART_MOVEMENTS_PAGE_LIMIT,
        });
        total = pageRes.total;
        collected.push(...pageRes.rows);
        if (pageRes.rows.length === 0 || collected.length >= total) {
          break;
        }
        if (collected.length >= CHART_MOVEMENTS_PAGE_LIMIT * CHART_MAX_PAGES_PER_STORAGE) {
          break;
        }
        page += 1;
      }

      const label = b.branchName ? `${b.storageName} (${b.branchName})` : b.storageName;
      storagesData.push({
        storageId: b.storageId,
        storageName: label,
        quantity: b.quantity,
        movements: collected.slice(0, CHART_MOVEMENTS_PAGE_LIMIT * CHART_MAX_PAGES_PER_STORAGE),
        movementsTotal: total,
      });
    }

    const { seriesLines, meta } = buildVariantStockBalanceChart({ storages: storagesData });

    const [storages, grid] = await Promise.all([
      listStoragesForPage(),
      InventoryRequest.search({
        search: sku || undefined,
        page: 1,
        limit: 5,
        sortField: "sku",
        sort: "asc",
      }),
    ]);
    const stockRow =
      grid.rows.find((r) => r.variantId === variantId) ?? (grid.rows.length === 1 ? grid.rows[0] : null);
    const unitLabel =
      stockRow?.unitOfMeasure?.trim() || stockRow?.stockUnitSymbol?.trim() || null;

    return {
      ok: true,
      data: {
        breakdown,
        seriesLines,
        meta,
        unitLabel,
        stockRow,
        storages,
      },
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : "Error al cargar saldo por almacén";
    return { ok: false, error: err };
  }
}

export async function listStockMovementsAction(input: {
  variantId: string;
  storageId?: string;
  page: number;
  limit: number;
}): Promise<ListStockMovementsResult | { error: string }> {
  const variantId = input.variantId?.trim() ?? "";
  if (!variantId) {
    return { error: "Variante es obligatoria" };
  }
  const storageId = input.storageId?.trim() || undefined;
  try {
    const r = await InventoryRequest.listStockMovements({
      variantId,
      storageId,
      page: Math.max(1, input.page),
      limit: Math.min(200, Math.max(1, input.limit)),
    });
    return r;
  } catch (e) {
    const err = e instanceof Error ? e.message : "Error al cargar movimientos de stock";
    return { error: err };
  }
}

export async function listStockForGrid(input: ListStockForGridInput): Promise<ListStockForGridResult> {
  const page = Math.max(1, input.page);
  const limit = Math.min(500, Math.max(1, input.limit));
  const sortField = input.sortField?.trim() || "productName";
  const sort = input.sort === "desc" ? "desc" : "asc";
  const r = await InventoryRequest.search({
    search: input.search?.trim(),
    storageId: input.storageId?.trim() || undefined,
    branchId: input.branchId?.trim() || undefined,
    stockAlerts: input.stockAlerts === true,
    page,
    limit,
    sortField,
    sort,
  });
  return { rows: r.rows, total: r.total, page, limit };
}

export async function adjustStockAction(input: {
  variantId: string;
  storageId: string;
  currentQuantity: number;
  targetQuantity: number;
  note?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const currentQuantity = Math.max(0, Number(input.currentQuantity) || 0);
  const targetQuantity = Math.max(0, Number(input.targetQuantity) || 0);
  const r = await InventoryRequest.adjust({
    variantId: input.variantId.trim(),
    storageId: input.storageId.trim(),
    currentQuantity,
    targetQuantity,
    note: input.note?.trim() || undefined,
  });
  if (r.success) {
    revalidateStockRoute();
  }
  return r;
}

export async function transferStockAction(input: {
  variantId: string;
  sourceStorageId: string;
  targetStorageId: string;
  quantity: number;
  note?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await InventoryRequest.transfer({
    variantId: input.variantId.trim(),
    sourceStorageId: input.sourceStorageId.trim(),
    targetStorageId: input.targetStorageId.trim(),
    quantity: input.quantity,
    note: input.note?.trim() || undefined,
  });
  if (r.success) {
    revalidateStockRoute();
  }
  return r;
}

export async function saveVariantStockConfigAction(input: {
  variantId: string;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  minimumStock: number;
  minimumStockEnabled: boolean;
  maximumStock: number;
  maximumStockEnabled: boolean;
  reorderPoint: number;
  reorderPointEnabled: boolean;
  storageThresholds: Array<{
    storageId: string;
    minimumStock: number | null;
    minimumStockEnabled: boolean | null;
    maximumStock: number | null;
    maximumStockEnabled: boolean | null;
    reorderPoint: number | null;
    reorderPointEnabled: boolean | null;
  }>;
}): Promise<{ success: true } | { success: false; error: string }> {
  const variantId = input.variantId.trim();
  if (!variantId) {
    return { success: false, error: "Variante no válida" };
  }

  const inv = await updateProductVariantInventoryPartialAction(variantId, {
    trackInventory: input.trackInventory,
    allowNegativeStock: input.allowNegativeStock,
    minimumStock: input.minimumStock,
    minimumStockEnabled: input.minimumStockEnabled,
    maximumStock: input.maximumStock,
    maximumStockEnabled: input.maximumStockEnabled,
    reorderPoint: input.reorderPoint,
    reorderPointEnabled: input.reorderPointEnabled,
  });
  if (!inv.success) {
    return inv;
  }

  const storage = await saveVariantStorageThresholdsAction({
    variantId,
    storageThresholds: input.storageThresholds,
  });
  if (!storage.success) {
    return storage;
  }

  revalidateStockRoute();
  return { success: true };
}
