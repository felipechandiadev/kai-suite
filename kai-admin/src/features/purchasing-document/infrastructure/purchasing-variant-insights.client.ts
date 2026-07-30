import type { VariantPurchaseInsights } from "../types/purchasing-document.types";

function apiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    "";
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return base.replace(/\/$/, "");
}

export async function fetchVariantPurchaseInsights(params: {
  variantId: string;
  accessToken?: string | null;
  activeCompanyId?: string | null;
  limit?: number;
}): Promise<VariantPurchaseInsights> {
  const q = new URLSearchParams();
  if (params.limit != null && params.limit > 0) {
    q.set("limit", String(Math.min(50, params.limit)));
  }
  const qs = q.toString();
  const path = `/api/product-variants/${encodeURIComponent(params.variantId)}/purchase-insights${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (params.accessToken) {
    headers.Authorization = `Bearer ${params.accessToken}`;
  }
  if (params.activeCompanyId) {
    headers["X-Active-Company-Id"] = params.activeCompanyId;
  }
  const res = await fetch(`${apiBase()}${path}`, { headers, credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text || `Error ${res.status} al cargar insights de compra`;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        message = parsed.message.trim();
      }
    } catch {
      /* usar texto crudo */
    }
    throw new Error(message);
  }
  const json = (await res.json()) as VariantPurchaseInsights & { success?: boolean; message?: string };
  if (json && typeof json === "object" && json.success === false) {
    throw new Error(json.message?.trim() || "No se pudo cargar insights de compra");
  }
  return json as VariantPurchaseInsights;
}
