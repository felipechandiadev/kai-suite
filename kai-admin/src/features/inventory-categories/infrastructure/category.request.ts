import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CategoryDetail, CategoryListItem } from "../types/category.types";

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

function normalizeWithCounts(row: unknown): CategoryListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name) : "";
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    parentId: o.parentId != null && String(o.parentId) ? String(o.parentId) : null,
    productCount: typeof o.productCount === "number" ? o.productCount : Number(o.productCount) || 0,
    childCount: typeof o.childCount === "number" ? o.childCount : Number(o.childCount) || 0,
  };
}

function mapCategoryToListItem(c: Record<string, unknown>): CategoryListItem | null {
  return normalizeWithCounts({
    ...c,
    productCount: c.productCount ?? 0,
    childCount: c.childCount ?? 0,
  });
}

function normalizeDetail(row: unknown): CategoryDetail | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name) : "";
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    description:
      o.description != null && String(o.description).trim() ? String(o.description).trim() : null,
    parentId: o.parentId != null && String(o.parentId) ? String(o.parentId) : null,
    sortOrder: typeof o.sortOrder === "number" ? o.sortOrder : Number(o.sortOrder) || 0,
    isActive: o.isActive !== false,
  };
}

export class CategoryRequest {
  static async findById(
    id: string,
  ): Promise<{ success: true; category: CategoryDetail } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`categories/${encodeURIComponent(id)}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = (await res.json()) as unknown;
      const cat = normalizeDetail(data);
      if (!cat) {
        return { success: false, error: "Categoría no encontrada" };
      }
      return { success: true, category: cat };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al cargar categoría";
      return { success: false, error: err };
    }
  }

  static async findAllWithCounts(): Promise<
    { success: true; categories: CategoryListItem[] } | { success: false; error: string; categories: [] }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("categories/with-counts"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, categories: [] };
      }
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) {
        return { success: true, categories: [] };
      }
      const categories = json
        .map((r) => normalizeWithCounts(r))
        .filter((x): x is CategoryListItem => x != null);
      return { success: true, categories };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar categorías";
      return { success: false, error: err, categories: [] };
    }
  }

  static async create(body: {
    name: string;
    description?: string;
    parentId?: string;
    sortOrder: number;
    isActive: boolean;
  }): Promise<{ success: true; category: CategoryListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("categories"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: body.name.trim(),
          description: body.description,
          parentId: body.parentId,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data.message === "string" && data.message) ||
          (Array.isArray(data.message) ? String(data.message[0]) : null) ||
          res.statusText;
        return { success: false, error: msg };
      }
      const item = mapCategoryToListItem(data);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, category: item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear categoría";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      name: string;
      description: string | null;
      parentId: string | null;
      sortOrder: number;
      isActive: boolean;
    },
  ): Promise<{ success: true; category: CategoryListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`categories/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: body.name.trim(),
          description: body.description,
          parentId: body.parentId,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data.message === "string" && data.message) ||
          (Array.isArray(data.message) ? String(data.message[0]) : null) ||
          res.statusText;
        return { success: false, error: msg };
      }
      const item = mapCategoryToListItem(data);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, category: item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar categoría";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`categories/${encodeURIComponent(id)}`), {
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
