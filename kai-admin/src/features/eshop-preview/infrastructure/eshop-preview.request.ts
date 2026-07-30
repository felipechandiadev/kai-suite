import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { EShopCatalogProductDetail } from "../types/catalog-product.types";

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

export class EShopPreviewRequest {
  static async getCatalogProductPreview(productId: string) {
    const res = await fetch(
      apiUrl(`e-shop/admin/catalog-products/${encodeURIComponent(productId)}/preview`),
      {
        headers: await authHeaders(),
        cache: "no-store",
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof json?.message === "string"
          ? json.message
          : "No se pudo cargar la vista previa eShop";
      return { success: false as const, error: message };
    }
    return { success: true as const, detail: json as EShopCatalogProductDetail };
  }
}
