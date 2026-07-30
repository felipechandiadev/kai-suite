import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { BranchListItem } from "../types/branch.types";

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

export class BranchRequest {
  static async findAll(includeInactive = true): Promise<
    { success: true; branches: BranchListItem[] } | { success: false; error: string; branches: [] }
  > {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(`${apiUrl("branches")}${q}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, branches: [] };
      }
      const data = (await res.json()) as unknown;
      if (Array.isArray(data)) {
        return { success: true, branches: data as BranchListItem[] };
      }
      return { success: true, branches: [] };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar sucursales";
      return { success: false, error: err, branches: [] };
    }
  }

  static async create(body: {
    name: string;
    address?: string | null;
    phone?: string | null;
    companyId?: string | null;
    location?: { lat: number; lng: number } | null;
    isActive?: boolean;
    laborUnitIds?: string[];
  }): Promise<
    { success: true; data: BranchListItem } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("branches"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: body.name,
          address: body.address && String(body.address).trim() ? String(body.address).trim() : null,
          phone: body.phone && String(body.phone).trim() ? String(body.phone).trim() : null,
          companyId: body.companyId && String(body.companyId).trim() ? String(body.companyId).trim() : null,
          location:
            body.location &&
            typeof body.location.lat === "number" &&
            typeof body.location.lng === "number"
              ? { lat: body.location.lat, lng: body.location.lng }
              : null,
          isActive: body.isActive !== false,
          laborUnitIds: body.laborUnitIds,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: BranchListItem;
        error?: string;
      };
      if (!res.ok) {
        return { success: false, error: data.error || res.statusText };
      }
      if (data.success && data.data) {
        return { success: true, data: data.data };
      }
      return { success: false, error: data.error || "No se pudo crear la sucursal" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear sucursal";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      name: string;
      address?: string | null;
      phone?: string | null;
      location?: { lat: number; lng: number } | null;
      isActive?: boolean;
      isHeadquarters?: boolean;
      laborUnitIds?: string[];
    },
  ): Promise<
    { success: true; data: BranchListItem } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`branches/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: body.name,
          address:
            body.address && String(body.address).trim() ? String(body.address).trim() : null,
          phone:
            body.phone && String(body.phone).trim() ? String(body.phone).trim() : null,
          location:
            body.location &&
            typeof body.location.lat === "number" &&
            typeof body.location.lng === "number"
              ? { lat: body.location.lat, lng: body.location.lng }
              : null,
          isActive: body.isActive,
          isHeadquarters: body.isHeadquarters,
          laborUnitIds: body.laborUnitIds,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: BranchListItem;
        error?: string;
      };
      if (!res.ok) {
        return { success: false, error: data.error || res.statusText };
      }
      if (data.success && data.data) {
        return { success: true, data: data.data };
      }
      return { success: false, error: data.error || "No se pudo actualizar la sucursal" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar sucursal";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`branches/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || "No se pudo eliminar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar";
      return { success: false, error: err };
    }
  }
}
