import { apiFailure } from "@/lib/auth/api-response";
import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type { StorageOption, StockStorageBreakdown, VariantStockRow } from "../types/stock.types";

function parseBreakdown(raw: unknown): StockStorageBreakdown[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const storageId = o.storageId != null ? String(o.storageId) : "";
      if (!storageId) return null;
      return {
        storageId,
        storageName: o.storageName != null ? String(o.storageName) : "",
        branchName:
          o.branchName != null && String(o.branchName).trim() ? String(o.branchName) : null,
        quantity:
          typeof o.quantity === "number" && Number.isFinite(o.quantity)
            ? o.quantity
            : Number(o.quantity) || 0,
        reservedStock:
          typeof o.reservedStock === "number" && Number.isFinite(o.reservedStock)
            ? o.reservedStock
            : typeof o.committedStock === "number" && Number.isFinite(o.committedStock)
              ? o.committedStock
              : Number(o.reservedStock ?? o.committedStock) || 0,
        availableStock: (() => {
          const physical =
            typeof o.quantity === "number" && Number.isFinite(o.quantity)
              ? o.quantity
              : Number(o.quantity) || 0;
          const reserved =
            typeof o.reservedStock === "number" && Number.isFinite(o.reservedStock)
              ? o.reservedStock
              : typeof o.committedStock === "number" && Number.isFinite(o.committedStock)
                ? o.committedStock
                : Number(o.reservedStock ?? o.committedStock) || 0;
          if (typeof o.availableStock === "number" && Number.isFinite(o.availableStock)) {
            return o.availableStock;
          }
          if (
            typeof o.availableAfterReservation === "number" &&
            Number.isFinite(o.availableAfterReservation)
          ) {
            return o.availableAfterReservation;
          }
          return physical - reserved;
        })(),
        committedStock:
          typeof o.committedStock === "number" && Number.isFinite(o.committedStock)
            ? o.committedStock
            : typeof o.reservedStock === "number" && Number.isFinite(o.reservedStock)
              ? o.reservedStock
              : Number(o.committedStock ?? o.reservedStock) || 0,
        stockLevelId:
          o.stockLevelId === undefined
            ? undefined
            : o.stockLevelId === null
              ? null
              : String(o.stockLevelId),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null) as StockStorageBreakdown[];
}

function parseStockLevelsResponse(json: unknown): Array<{
  id: string;
  storageId: string;
  physicalStock: number;
  committedStock: number;
  availableStock: number;
}> {
  if (!json || typeof json !== "object") return [];
  const levelsRaw = (json as Record<string, unknown>).stockLevels;
  if (!Array.isArray(levelsRaw)) return [];
  return levelsRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      const storageId = o.storageId != null ? String(o.storageId) : "";
      if (!storageId) return null;
      const physical =
        typeof o.physicalStock === "number" && Number.isFinite(o.physicalStock)
          ? o.physicalStock
          : Number(o.physicalStock) || 0;
      const committed =
        typeof o.committedStock === "number" && Number.isFinite(o.committedStock)
          ? o.committedStock
          : Number(o.committedStock) || 0;
      const available =
        typeof o.availableStock === "number" && Number.isFinite(o.availableStock)
          ? o.availableStock
          : physical - committed;
      return {
        id,
        storageId,
        physicalStock: physical,
        committedStock: committed,
        availableStock: available,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

export class StockRequest {
  /**
   * Stock por variante vía `GET /stock-levels?productVariantId=…` (no depende del listado paginado de inventario).
   */
  static async getVariantStock(
    variantId: string,
    sku?: string,
  ): Promise<
    | { success: true; row: VariantStockRow }
    | { success: false; error: string; unauthorized?: boolean }
  > {
    const headers = await authHeaders();
    const vid = variantId.trim();
    if (!vid) {
      return { success: false, error: "Variante no indicada" };
    }
    try {
      const [levelsRes, filtersRes] = await Promise.all([
        fetch(apiUrl(`stock-levels?productVariantId=${encodeURIComponent(vid)}`), {
          method: "GET",
          headers,
          cache: "no-store",
        }),
        fetch(apiUrl("inventory/filters"), { method: "GET", headers, cache: "no-store" }),
      ]);

      const levelsJson = (await levelsRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (!levelsRes.ok) {
        return apiFailure(levelsRes, levelsJson);
      }

      const filtersJson = (await filtersRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (!filtersRes.ok) {
        const filtersFail = apiFailure(filtersRes, filtersJson);
        if (filtersFail.unauthorized) {
          return filtersFail;
        }
      }

      const storageById = new Map<string, StorageOption>();
      if (filtersRes.ok) {
        const storagesRaw = filtersJson.storages;
        if (Array.isArray(storagesRaw)) {
          for (const s of storagesRaw) {
            if (!s || typeof s !== "object") continue;
            const o = s as Record<string, unknown>;
            const id = o.id != null ? String(o.id) : "";
            if (!id) continue;
            const branch = o.branch as Record<string, unknown> | undefined;
            storageById.set(id, {
              id,
              name: o.name != null ? String(o.name) : "",
              branchName:
                branch?.name != null && String(branch.name).trim()
                  ? String(branch.name)
                  : null,
            });
          }
        }
      }

      const levels = parseStockLevelsResponse(levelsJson);
      const storageBreakdown: StockStorageBreakdown[] = levels.map((sl) => {
        const meta = storageById.get(sl.storageId);
        return {
          storageId: sl.storageId,
          storageName: meta?.name ?? "",
          branchName: meta?.branchName ?? null,
          quantity: sl.physicalStock,
          reservedStock: sl.committedStock,
          availableStock: sl.availableStock,
          committedStock: sl.committedStock,
          stockLevelId: sl.id || null,
        };
      });

      return {
        success: true,
        row: {
          variantId: vid,
          productName: "",
          sku: sku?.trim() ?? "",
          stockUnitSymbol: "",
          storageBreakdown,
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar stock",
      };
    }
  }

  static async listStorages(): Promise<
    | { success: true; storages: StorageOption[] }
    | { success: false; error: string; unauthorized?: boolean }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("inventory/filters"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      const storagesRaw = data.storages;
      const storages = Array.isArray(storagesRaw)
        ? storagesRaw
            .map((s) => {
              if (!s || typeof s !== "object") return null;
              const o = s as Record<string, unknown>;
              const id = o.id != null ? String(o.id) : "";
              if (!id) return null;
              const branch = o.branch as Record<string, unknown> | undefined;
              const branchName =
                branch?.name != null && String(branch.name).trim()
                  ? String(branch.name)
                  : null;
              return {
                id,
                name: o.name != null ? String(o.name) : "",
                branchName,
              } satisfies StorageOption;
            })
            .filter((x): x is StorageOption => x != null)
        : [];
      return { success: true, storages };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar almacenes",
      };
    }
  }

  /** Crea el registro de stock en 0 para variante + almacén si aún no existe. */
  static async ensureStockLevel(
    productVariantId: string,
    storageId: string,
  ): Promise<{ success: true } | { success: false; error: string; unauthorized?: boolean }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("inventory/stock-levels/thresholds"), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ productVariantId, storageId }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al inicializar stock",
      };
    }
  }

  static async adjust(body: {
    variantId: string;
    storageId: string;
    currentQuantity: number;
    targetQuantity: number;
    note?: string;
  }): Promise<{ success: true } | { success: false; error: string; unauthorized?: boolean }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("inventory/adjust"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al ajustar stock",
      };
    }
  }

  static async transfer(body: {
    variantId: string;
    sourceStorageId: string;
    targetStorageId: string;
    quantity: number;
    note?: string;
  }): Promise<{ success: true } | { success: false; error: string; unauthorized?: boolean }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("inventory/transfer"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al transferir stock",
      };
    }
  }
}
