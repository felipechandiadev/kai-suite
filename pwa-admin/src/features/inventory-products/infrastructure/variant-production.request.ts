import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type VariantProductionUnitRoutingItem = {
  branchId: string;
  productionUnitId: string;
  isDefault: boolean;
};

export type VariantBranchAvailabilityItem = {
  branchId: string;
  isActive: boolean;
};

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export const VariantProductionRequest = {
  async listRouting(variantId: string): Promise<VariantProductionUnitRoutingItem[]> {
    const res = await fetch(
      apiUrl(`/product-variants/${encodeURIComponent(variantId)}/production-units`),
      { headers: await authHeaders(), cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: unknown };
    if (!Array.isArray(data.items)) return [];
    return data.items.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        branchId: String(r.branchId ?? ""),
        productionUnitId: String(r.productionUnitId ?? ""),
        isDefault: r.isDefault === true,
      };
    });
  },

  async upsertRouting(
    variantId: string,
    items: VariantProductionUnitRoutingItem[],
  ): Promise<{ success: true; items: VariantProductionUnitRoutingItem[] } | { success: false; message: string }> {
    const res = await fetch(
      apiUrl(`/product-variants/${encodeURIComponent(variantId)}/production-units`),
      {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ items }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `No se pudo guardar (HTTP ${res.status})`;
      try {
        const json = JSON.parse(text) as { message?: string | string[] };
        if (typeof json.message === "string" && json.message.trim()) message = json.message.trim();
        else if (Array.isArray(json.message)) {
          message = json.message.map(String).filter(Boolean).join(", ") || message;
        }
      } catch {
        if (text.trim()) message = text.trim();
      }
      return { success: false, message };
    }
    const data = (await res.json()) as { items?: unknown };
    const itemsOut = Array.isArray(data.items)
      ? data.items.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            branchId: String(r.branchId ?? ""),
            productionUnitId: String(r.productionUnitId ?? ""),
            isDefault: r.isDefault === true,
          };
        })
      : [];
    return { success: true, items: itemsOut };
  },

  async listAvailability(
    variantId: string,
  ): Promise<VariantBranchAvailabilityItem[]> {
    const res = await fetch(
      apiUrl(`/product-variants/${encodeURIComponent(variantId)}/branch-availability`),
      { headers: await authHeaders(), cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: unknown };
    if (!Array.isArray(data.items)) return [];
    return data.items.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        branchId: String(r.branchId ?? ""),
        isActive: r.isActive !== false,
      };
    });
  },

  async upsertAvailability(
    variantId: string,
    items: VariantBranchAvailabilityItem[],
  ): Promise<
    | { success: true; items: VariantBranchAvailabilityItem[] }
    | { success: false; message: string }
  > {
    const res = await fetch(
      apiUrl(`/product-variants/${encodeURIComponent(variantId)}/branch-availability`),
      {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ items }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `No se pudo guardar (HTTP ${res.status})`;
      try {
        const json = JSON.parse(text) as { message?: string | string[] };
        if (typeof json.message === "string" && json.message.trim()) message = json.message.trim();
        else if (Array.isArray(json.message)) {
          message = json.message.map(String).filter(Boolean).join(", ") || message;
        }
      } catch {
        if (text.trim()) message = text.trim();
      }
      return { success: false, message };
    }
    const data = (await res.json()) as { items?: unknown };
    const itemsOut = Array.isArray(data.items)
      ? data.items.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            branchId: String(r.branchId ?? ""),
            isActive: r.isActive !== false,
          };
        })
      : [];
    return { success: true, items: itemsOut };
  },
};
