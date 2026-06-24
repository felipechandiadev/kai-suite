import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  EShopFulfillmentMethodRow,
  EShopFulfillmentSettings,
  EShopFulfillmentStatus,
  EShopOrderDetail,
  EShopOrderListRow,
} from "../types/eshop-fulfillment.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export class EShopFulfillmentRequest {
  static async listMethods(): Promise<EShopFulfillmentMethodRow[]> {
    const res = await fetch(apiUrl("/e-shop/admin/fulfillment-methods"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async createMethod(body: Partial<EShopFulfillmentMethodRow>) {
    const res = await fetch(apiUrl("/e-shop/admin/fulfillment-methods"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async updateMethod(id: string, body: Partial<EShopFulfillmentMethodRow>) {
    const res = await fetch(apiUrl(`/e-shop/admin/fulfillment-methods/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async deleteMethod(id: string) {
    const res = await fetch(apiUrl(`/e-shop/admin/fulfillment-methods/${id}`), {
      method: "DELETE",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  static async getSettings(): Promise<EShopFulfillmentSettings> {
    const res = await fetch(apiUrl("/e-shop/admin/fulfillment-settings"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async updateSettings(body: Partial<EShopFulfillmentSettings>) {
    const res = await fetch(apiUrl("/e-shop/admin/fulfillment-settings"), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<EShopFulfillmentSettings>;
  }

  static async listOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ data: EShopOrderListRow[]; total: number; page: number; limit: number }> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    const res = await fetch(apiUrl(`/e-shop/admin/orders?${q}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async getOrder(id: string): Promise<EShopOrderDetail> {
    const res = await fetch(apiUrl(`/e-shop/admin/orders/${id}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async updateOrderStatus(id: string, status: EShopFulfillmentStatus, note?: string) {
    const res = await fetch(apiUrl(`/e-shop/admin/orders/${id}/status`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ status, note }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<EShopOrderDetail>;
  }

  static async cancelOrderBackorder(id: string, reason?: string) {
    const res = await fetch(apiUrl(`/e-shop/admin/orders/${id}/cancel-backorder`), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ reason: reason?.trim() || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg =
        typeof data?.message === "string"
          ? data.message
          : Array.isArray(data?.message)
            ? data.message.join(", ")
            : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return res.json();
  }

  static async convertOrderToSale(id: string) {
    const res = await fetch(apiUrl(`/e-shop/admin/orders/${id}/convert-to-sale`), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg =
        typeof data?.message === "string"
          ? data.message
          : Array.isArray(data?.message)
            ? data.message.join(", ")
            : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return res.json();
  }
}
