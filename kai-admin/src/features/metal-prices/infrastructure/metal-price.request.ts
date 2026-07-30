import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { MetalPriceRow } from "../types/metal-price.types";

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

function normalizeRow(row: unknown): MetalPriceRow | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  return {
    id,
    companyId: o.companyId != null ? String(o.companyId) : "",
    metal: o.metal != null ? String(o.metal) : "",
    date: o.date != null ? String(o.date) : "",
    valueCLP: Number(o.valueCLP) || 0,
    notes: o.notes != null && String(o.notes).trim() ? String(o.notes) : null,
  };
}

export class MetalPriceRequest {
  static async findAll(): Promise<
    { success: true; rows: MetalPriceRow[] } | { success: false; error: string; rows: [] }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("metal-prices"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: unknown[];
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: body.message || res.statusText, rows: [] };
      }
      const raw = Array.isArray(body.data) ? body.data : [];
      const rows = raw.map(normalizeRow).filter((r): r is MetalPriceRow => r != null);
      return { success: true, rows };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar precios de metales";
      return { success: false, error: err, rows: [] };
    }
  }

  static async create(body: {
    metal: string;
    date: string;
    valueCLP: number;
    notes?: string | null;
  }): Promise<{ success: true; data: MetalPriceRow } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("metal-prices"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          metal: body.metal,
          date: body.date,
          valueCLP: body.valueCLP,
          notes: body.notes?.trim() || undefined,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: unknown;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data.message || res.statusText };
      }
      const row = normalizeRow(data.data);
      if (data.success && row) {
        return { success: true, data: row };
      }
      return { success: false, error: data.message || "No se pudo crear el precio" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear precio de metal";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      metal: string;
      date: string;
      valueCLP: number;
      notes?: string | null;
    },
  ): Promise<{ success: true; data: MetalPriceRow } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`metal-prices/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          metal: body.metal,
          date: body.date,
          valueCLP: body.valueCLP,
          notes: body.notes?.trim() || undefined,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: unknown;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data.message || res.statusText };
      }
      const row = normalizeRow(data.data);
      if (data.success && row) {
        return { success: true, data: row };
      }
      return { success: false, error: data.message || "No se pudo actualizar el precio" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar precio de metal";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`metal-prices/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data.message || res.statusText };
      }
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.message || "No se pudo eliminar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar precio de metal";
      return { success: false, error: err };
    }
  }
}
