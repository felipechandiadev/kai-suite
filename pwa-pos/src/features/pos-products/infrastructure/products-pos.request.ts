import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  PosProductSearchItem,
  PosProductSearchResponse,
  PosVariantsLookupResponse,
  PosVariantStockBreakdownResponse,
  PosVariantStockByStorageRow,
} from "../types/pos-product.types";

export class ProductsPosRequest {
  static async search(input: {
    query?: string;
    priceListId: string;
    branchId?: string | null;
    pointOfSaleId?: string | null;
    productTypes?: string[];
    page: number;
    pageSize: number;
  }): Promise<PosProductSearchResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const qs = new URLSearchParams();
    if (input.query?.trim()) qs.set("query", input.query.trim());
    qs.set("priceListId", input.priceListId);
    if (input.branchId?.trim()) qs.set("branchId", input.branchId.trim());
    if (input.pointOfSaleId?.trim()) qs.set("pointOfSaleId", input.pointOfSaleId.trim());
    if (input.productTypes?.length) {
      qs.set("productTypes", input.productTypes.join(","));
    }
    qs.set("page", String(Math.max(1, input.page)));
    qs.set("pageSize", String(Math.max(1, input.pageSize)));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
      const res = await fetch(`${base}/api/products/pos/search?${qs.toString()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (Array.isArray(data?.message) ? (data.message as string[]).join("; ") : null) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg), statusCode: res.status };
      }

      if (data?.success !== true) {
        return { success: false, message: "Respuesta inválida del servidor", statusCode: res.status };
      }

      return data as unknown as PosProductSearchResponse;
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }

  static async lookupVariants(input: {
    variantIds: string[];
    pointOfSaleId?: string | null;
    branchId?: string | null;
    priceListId?: string | null;
  }): Promise<PosVariantsLookupResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const ids = [...new Set(input.variantIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      return { success: true, products: [] };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const qs = new URLSearchParams();
    qs.set("variantIds", ids.join(","));
    if (input.pointOfSaleId?.trim()) qs.set("pointOfSaleId", input.pointOfSaleId.trim());
    if (input.branchId?.trim()) qs.set("branchId", input.branchId.trim());
    if (input.priceListId?.trim()) qs.set("priceListId", input.priceListId.trim());

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
      const res = await fetch(`${base}/api/products/pos/variants/lookup?${qs.toString()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (Array.isArray(data?.message) ? (data.message as string[]).join("; ") : null) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg), statusCode: res.status };
      }

      if (data?.success !== true) {
        return { success: false, message: "Respuesta inválida del servidor", statusCode: res.status };
      }

      const products = Array.isArray(data.products) ? data.products : [];
      return { success: true, products: products as PosProductSearchItem[] };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }

  static async getVariantStock(input: {
    variantId: string;
    pointOfSaleId: string;
  }): Promise<
    | {
        success: true;
        storageId: string;
        storageName: string | null;
        trackInventory: boolean;
        availableStock: number | null;
        availableStockBase: number | null;
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const qs = new URLSearchParams();
    qs.set("pointOfSaleId", input.pointOfSaleId.trim());

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
      const res = await fetch(
        `${base}/api/products/pos/variants/${encodeURIComponent(input.variantId.trim())}/stock-by-storage?${qs.toString()}`,
        { method: "GET", headers, cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (Array.isArray(data?.message) ? (data.message as string[]).join("; ") : null) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg), statusCode: res.status };
      }
      if (data?.success !== true) {
        return { success: false, message: "Respuesta inválida del servidor", statusCode: res.status };
      }
      return {
        success: true,
        storageId: String(data.storageId ?? ""),
        storageName: (data.storageName as string | null) ?? null,
        trackInventory: Boolean(data.trackInventory),
        availableStock:
          data.availableStock === null || data.availableStock === undefined
            ? null
            : Number(data.availableStock),
        availableStockBase:
          data.availableStockBase === null || data.availableStockBase === undefined
            ? null
            : Number(data.availableStockBase),
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }

  static async getVariantStockBreakdown(input: {
    variantId: string;
    pointOfSaleId?: string;
  }): Promise<PosVariantStockBreakdownResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const qs = new URLSearchParams();
    if (input.pointOfSaleId?.trim()) {
      qs.set("pointOfSaleId", input.pointOfSaleId.trim());
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const res = await fetch(
        `${base}/api/products/pos/variants/${encodeURIComponent(input.variantId.trim())}/stock-breakdown${suffix}`,
        { method: "GET", headers, cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (Array.isArray(data?.message) ? (data.message as string[]).join("; ") : null) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg), statusCode: res.status };
      }
      if (data?.success !== true) {
        return { success: false, message: "Respuesta inválida del servidor", statusCode: res.status };
      }

      const breakdownRaw = Array.isArray(data.breakdown) ? data.breakdown : [];
      const breakdown: PosVariantStockByStorageRow[] = breakdownRaw
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }
          const o = row as Record<string, unknown>;
          const storageId = o.storageId != null ? String(o.storageId) : "";
          if (!storageId) {
            return null;
          }
          return {
            storageId,
            storageName: o.storageName != null ? String(o.storageName) : "",
            branchName:
              o.branchName != null && String(o.branchName).trim()
                ? String(o.branchName).trim()
                : null,
            physicalStock:
              o.physicalStock === null || o.physicalStock === undefined
                ? null
                : Number(o.physicalStock),
            physicalStockBase:
              o.physicalStockBase === null || o.physicalStockBase === undefined
                ? null
                : Number(o.physicalStockBase),
            reservedStock:
              o.reservedStock === null || o.reservedStock === undefined
                ? null
                : Number(o.reservedStock),
            reservedStockBase:
              o.reservedStockBase === null || o.reservedStockBase === undefined
                ? null
                : Number(o.reservedStockBase),
            availableStock:
              o.availableStock === null || o.availableStock === undefined
                ? null
                : Number(o.availableStock),
            availableStockBase:
              o.availableStockBase === null || o.availableStockBase === undefined
                ? null
                : Number(o.availableStockBase),
            isPosStorage: o.isPosStorage === true,
          };
        })
        .filter((x): x is PosVariantStockByStorageRow => x != null);

      return {
        success: true,
        variantId: String(data.variantId ?? input.variantId),
        sku: (data.sku as string | null) ?? null,
        trackInventory: Boolean(data.trackInventory),
        posStorageId:
          data.posStorageId != null && String(data.posStorageId).trim()
            ? String(data.posStorageId)
            : null,
        breakdown,
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }
}
