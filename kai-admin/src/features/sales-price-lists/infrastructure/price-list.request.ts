import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PriceListListItem } from "../types/price-list.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

function normalizeItem(row: unknown): PriceListListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null && String(o.id) ? String(o.id) : null;
  const name = o.name != null ? String(o.name) : "";
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    priceListType: o.priceListType != null ? String(o.priceListType) : "RETAIL",
    currency: o.currency != null ? String(o.currency) : "CLP",
    validFrom: o.validFrom as PriceListListItem["validFrom"],
    validUntil: o.validUntil as PriceListListItem["validUntil"],
    priority: typeof o.priority === "number" ? o.priority : Number(o.priority) || 0,
    isDefault: o.isDefault === true,
    isActive: o.isActive !== false,
    nonDeletable: o.nonDeletable === true,
    description: o.description != null && String(o.description) ? String(o.description) : null,
    createdAt: o.createdAt as PriceListListItem["createdAt"],
    updatedAt: o.updatedAt as PriceListListItem["updatedAt"],
  };
}

export class PriceListRequest {
  static async findAll(
    includeInactive = true,
  ): Promise<
    { success: true; priceLists: PriceListListItem[] } | { success: false; error: string; priceLists: [] }
  > {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(`${apiUrl("price-lists")}${q}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, priceLists: [] };
      }
      const json = (await res.json()) as unknown;
      if (Array.isArray(json)) {
        const priceLists = json
          .map((r) => normalizeItem(r))
          .filter((x): x is PriceListListItem => x != null);
        return { success: true, priceLists };
      }
      return { success: true, priceLists: [] };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar listas de precio";
      return { success: false, error: err, priceLists: [] };
    }
  }

  static async create(body: {
    name: string;
    priceListType: string;
    currency: string;
    isActive: boolean;
    isDefault: boolean;
    description: string | null;
  }): Promise<
    { success: true; priceList: PriceListListItem } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("price-lists"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: body.name.trim(),
          priceListType: body.priceListType,
          currency: body.currency,
          isActive: body.isActive,
          isDefault: body.isDefault,
          description: body.description,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        priceList?: unknown;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        return { success: false, error: data.message || data.error || res.statusText };
      }
      if (data.success && data.priceList) {
        const item = normalizeItem(data.priceList);
        if (item) {
          return { success: true, priceList: item };
        }
      }
      return { success: false, error: data.error || "No se pudo crear la lista" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear lista de precio";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      name: string;
      priceListType: string;
      currency: string;
      isActive: boolean;
      isDefault: boolean;
      description: string | null;
    },
  ): Promise<
    { success: true; priceList: PriceListListItem } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`price-lists/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: body.name.trim(),
          priceListType: body.priceListType,
          currency: body.currency,
          isActive: body.isActive,
          isDefault: body.isDefault,
          description: body.description,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        priceList?: unknown;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        return { success: false, error: data.message || data.error || res.statusText };
      }
      if (data.success && data.priceList) {
        const item = normalizeItem(data.priceList);
        if (item) {
          return { success: true, priceList: item };
        }
      }
      return { success: false, error: (data as { error?: string }).error || "No se pudo actualizar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar";
      return { success: false, error: err };
    }
  }

  static async remove(
    id: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`price-lists/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.message || "No se pudo eliminar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar";
      return { success: false, error: err };
    }
  }
}
