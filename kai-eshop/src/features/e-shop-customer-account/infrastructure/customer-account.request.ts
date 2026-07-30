import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { getServerBackendApiBase } from "@/lib/backend-api-url";
import { parseEshopErrorResponse } from "@/features/e-shop-storefront/infrastructure/eshop-api-error";
import type {
  EShopCustomerOrderDetail,
  EShopCustomerProfile,
  EShopCustomerSummary,
} from "../types/customer-account.types";

function apiUrl(path: string): string {
  const base = getServerBackendApiBase();
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

function headers(sessionToken?: string | null): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-EShop-Store-Slug": getEShopStoreSlug(),
  };
  if (sessionToken) h.Authorization = `Bearer ${sessionToken}`;
  return h;
}

export class EShopCustomerAccountRequest {
  static async checkUsername(username: string) {
    const q = new URLSearchParams({ username });
    const res = await fetch(apiUrl(`/e-shop/auth/check-username?${q}`), {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<{ available: boolean; message?: string }>;
  }

  static async register(body: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    documentNumber?: string;
  }) {
    const res = await fetch(apiUrl("/e-shop/auth/register"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<{ sessionToken: string; emailVerificationRequired: boolean }>;
  }

  static async login(body: { login: string; password: string }) {
    const res = await fetch(apiUrl("/e-shop/auth/login"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<{ sessionToken: string }>;
  }

  static async verifyEmail(token: string) {
    const res = await fetch(apiUrl("/e-shop/auth/verify-email"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
  }

  static async getSummary(sessionToken: string) {
    const res = await fetch(apiUrl("/e-shop/me/summary"), {
      headers: headers(sessionToken),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<EShopCustomerSummary>;
  }

  static async getProfile(sessionToken: string) {
    const res = await fetch(apiUrl("/e-shop/me/profile"), {
      headers: headers(sessionToken),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<EShopCustomerProfile>;
  }

  static async updateProfile(
    sessionToken: string,
    body: { firstName?: string; lastName?: string; phone?: string; address?: string },
  ) {
    const res = await fetch(apiUrl("/e-shop/me/profile"), {
      method: "PATCH",
      headers: headers(sessionToken),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<EShopCustomerProfile>;
  }

  static async listOrders(sessionToken: string, page = 1, limit = 20) {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await fetch(apiUrl(`/e-shop/me/orders?${q}`), {
      headers: headers(sessionToken),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<{
      data: EShopCustomerOrderDetail[];
      total: number;
      page: number;
      limit: number;
    }>;
  }

  static async getOrder(sessionToken: string, orderId: string) {
    const res = await fetch(apiUrl(`/e-shop/me/orders/${orderId}`), {
      headers: headers(sessionToken),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<EShopCustomerOrderDetail>;
  }

  static async getPayments(sessionToken: string) {
    const res = await fetch(apiUrl("/e-shop/me/payments"), {
      headers: headers(sessionToken),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<{ payments: unknown[] }>;
  }

  static async getDebts(sessionToken: string) {
    const res = await fetch(apiUrl("/e-shop/me/debts"), {
      headers: headers(sessionToken),
      cache: "no-store",
    });
    if (!res.ok) throw await parseEshopErrorResponse(res);
    return res.json() as Promise<{
      quotas: Array<{
        id: string;
        amount: number;
        amountPaid: number;
        dueDate: string;
        documentNumber: string | null;
      }>;
      totalDue: number;
      credit: { limit: number; used: number; available: number } | null;
    }>;
  }
}
