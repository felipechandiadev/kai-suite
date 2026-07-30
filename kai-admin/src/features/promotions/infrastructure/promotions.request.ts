import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreatePromotionInput,
  PromotionDetail,
  PromotionRow,
  UpdatePromotionInput,
} from "../types/promotion.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as any)?.activeCompanyId as
    | string
    | null
    | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export type ListPromotionsResult =
  | { success: true; items: PromotionRow[]; total: number; page: number; limit: number }
  | { success: false; error: string };

export class PromotionsRequest {
  static async list(query: Record<string, string | undefined> = {}): Promise<ListPromotionsResult> {
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v != null && v !== "") params.set(k, v);
      }
      const qs = params.toString();
      const res = await fetch(apiUrl(`promotions${qs ? `?${qs}` : ""}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data?.message || res.statusText };
      return {
        success: true,
        items: Array.isArray(data?.items) ? data.items : [],
        total: typeof data?.total === "number" ? data.total : 0,
        page: typeof data?.page === "number" ? data.page : 1,
        limit: typeof data?.limit === "number" ? data.limit : 25,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al listar promociones",
      };
    }
  }

  static async get(
    id: string,
  ): Promise<
    { success: true; promotion: PromotionDetail } | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl(`promotions/${encodeURIComponent(id)}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data?.message || res.statusText };
      if (data?.promotion) return { success: true, promotion: data.promotion };
      return { success: false, error: "Respuesta inválida" };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al obtener promoción",
      };
    }
  }

  static async create(
    body: CreatePromotionInput,
  ): Promise<
    { success: true; promotion: PromotionDetail } | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("promotions"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data?.message || res.statusText };
      if (data?.promotion) return { success: true, promotion: data.promotion };
      return { success: false, error: "Respuesta inválida" };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al crear promoción",
      };
    }
  }

  static async update(
    id: string,
    body: UpdatePromotionInput,
  ): Promise<
    { success: true; promotion: PromotionDetail } | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl(`promotions/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data?.message || res.statusText };
      if (data?.promotion) return { success: true, promotion: data.promotion };
      return { success: false, error: "Respuesta inválida" };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al actualizar promoción",
      };
    }
  }

  static async toggleActive(
    id: string,
    isActive: boolean,
  ): Promise<
    { success: true; promotion: PromotionDetail } | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`promotions/${encodeURIComponent(id)}/active`),
        {
          method: "PATCH",
          headers: await authHeaders(),
          body: JSON.stringify({ isActive }),
          cache: "no-store",
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data?.message || res.statusText };
      if (data?.promotion) return { success: true, promotion: data.promotion };
      return { success: false, error: "Respuesta inválida" };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cambiar estado",
      };
    }
  }

  static async remove(
    id: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const res = await fetch(apiUrl(`promotions/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al eliminar",
      };
    }
  }
}
