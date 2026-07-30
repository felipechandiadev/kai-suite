import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { BrandListItem } from "../types/brand.types";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

function readIsActive(o: Record<string, unknown>): boolean {
  if (typeof o.isActive === "boolean") {
    return o.isActive;
  }
  if (typeof o.is_active === "boolean") {
    return o.is_active;
  }
  return true;
}

function normalizeBrand(row: unknown): BrandListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name) : "";
  if (!id || !name.trim()) {
    return null;
  }
  const descRaw = o.description;
  const description =
    descRaw != null && String(descRaw).trim() ? String(descRaw).trim() : null;
  const pcRaw = o.productCount ?? o.product_count;
  const n = Number(pcRaw);
  const productCount = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  return {
    id,
    name: name.trim(),
    description,
    isActive: readIsActive(o),
    productCount,
  };
}

function nestErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const m = data.message;
  if (Array.isArray(m)) {
    return m.map(String).join("; ") || fallback;
  }
  if (typeof m === "string" && m.trim()) {
    return m.trim();
  }
  return fallback;
}

export class BrandRequest {
  static async findAll(includeInactive = true): Promise<
    { success: true; brands: BrandListItem[] } | { success: false; error: string; brands: [] }
  > {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(apiUrl(`brands/with-counts${q}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, brands: [] };
      }
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) {
        return { success: true, brands: [] };
      }
      const brands = json.map(normalizeBrand).filter((x): x is BrandListItem => x != null);
      return { success: true, brands };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar marcas";
      return { success: false, error: err, brands: [] };
    }
  }

  static async create(body: {
    name: string;
    description?: string | null;
    isActive?: boolean;
  }): Promise<{ success: true; brand: BrandListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("brands"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: body.name.trim(),
          description: body.description?.trim() ? body.description.trim() : null,
          isActive: body.isActive !== false,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const brand = normalizeBrand(data);
      if (!brand) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, brand };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear marca";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: { name: string; description: string | null; isActive: boolean },
  ): Promise<{ success: true; brand: BrandListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`brands/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: body.name.trim(),
          description: body.description?.trim() ? body.description.trim() : null,
          isActive: body.isActive,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const brand = normalizeBrand(data);
      if (!brand) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, brand };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar marca";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`brands/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: "No se pudo eliminar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar";
      return { success: false, error: err };
    }
  }
}
