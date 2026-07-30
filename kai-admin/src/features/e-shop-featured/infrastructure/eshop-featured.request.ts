import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { EShopFeaturedProductsState } from "../types/featured.types";

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

export class EShopFeaturedRequest {
  static async listFeaturedProducts(): Promise<EShopFeaturedProductsState> {
    const res = await fetch(apiUrl("/e-shop/admin/featured-products"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }

  static async replaceFeaturedProductIds(productIds: string[]) {
    const res = await fetch(apiUrl("/e-shop/admin/featured-product-ids"), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ productIds }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      const message =
        typeof json?.message === "string" ? json.message : "No se pudo guardar productos destacados";
      return { success: false as const, error: message };
    }
    const json = await res.json();
    return { success: true as const, eShopSettings: json };
  }
}
