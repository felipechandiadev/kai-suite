import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { StorageCategory, StorageListItem, StorageType } from "../types/storage.types";
import { STORAGE_CATEGORIES, STORAGE_TYPES } from "../types/storage.types";

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

function isStorageType(v: string): v is StorageType {
  return (STORAGE_TYPES as readonly string[]).includes(v);
}

function isStorageCategory(v: string): v is StorageCategory {
  return (STORAGE_CATEGORIES as readonly string[]).includes(v);
}

function normalizeStorage(row: unknown): StorageListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name) : "";
  const typeRaw = o.type != null ? String(o.type) : "";
  const catRaw = o.category != null ? String(o.category) : "";
  if (!id || !name || !isStorageType(typeRaw) || !isStorageCategory(catRaw)) {
    return null;
  }
  const branchRaw = o.branch;
  let branch: { id: string; name: string } | null = null;
  if (branchRaw && typeof branchRaw === "object") {
    const b = branchRaw as Record<string, unknown>;
    const bid = b.id != null ? String(b.id) : "";
    const bname = b.name != null ? String(b.name) : "";
    if (bid && bname) {
      branch = { id: bid, name: bname };
    }
  }
  const cap = o.capacity;
  const capacity =
    cap == null || cap === ""
      ? null
      : typeof cap === "number"
        ? cap
        : Number(cap);

  return {
    id,
    name,
    code: o.code != null && String(o.code).trim() ? String(o.code).trim() : null,
    type: typeRaw,
    category: catRaw,
    branchId: o.branchId != null && String(o.branchId) ? String(o.branchId) : null,
    branch,
    address: o.address != null && String(o.address).trim() ? String(o.address).trim() : null,
    location: o.location ?? null,
    capacity: capacity != null && Number.isFinite(capacity) ? capacity : null,
    isDefault: o.isDefault === true,
    isActive: o.isActive !== false,
    productionUnitId:
      o.productionUnitId != null && String(o.productionUnitId)
        ? String(o.productionUnitId)
        : null,
    laborUnitIds: Array.isArray(o.laborUnitIds)
      ? o.laborUnitIds.map((id) => String(id)).filter(Boolean)
      : [],
    createdAt: o.createdAt != null ? String(o.createdAt) : undefined,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
  };
}

async function errorMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const m = data.message;
  if (Array.isArray(m)) {
    return m.map(String).join("; ");
  }
  if (typeof m === "string" && m.trim()) {
    return m;
  }
  return res.statusText;
}

export class StorageRequest {
  static async findAll(
    includeInactive = true,
  ): Promise<
    { success: true; storages: StorageListItem[] } | { success: false; error: string; storages: [] }
  > {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(apiUrl(`storages${q}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res), storages: [] };
      }
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) {
        return { success: true, storages: [] };
      }
      const storages = json.map(normalizeStorage).filter((x): x is StorageListItem => x != null);
      return { success: true, storages };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar almacenes";
      return { success: false, error: err, storages: [] };
    }
  }

  static async findById(
    id: string,
  ): Promise<{ success: true; storage: StorageListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`storages/${encodeURIComponent(id)}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const data = (await res.json()) as unknown;
      const s = normalizeStorage(data);
      if (!s) {
        return { success: false, error: "Almacén no encontrado" };
      }
      return { success: true, storage: s };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al cargar almacén";
      return { success: false, error: err };
    }
  }

  static async create(body: {
    name: string;
    code?: string | null;
    branchId?: string | null;
    type: StorageType;
    category: StorageCategory;
    capacity?: number | null;
    address?: string | null;
    location?: { lat: number; lng: number } | null;
    isDefault?: boolean;
    isActive?: boolean;
    laborUnitIds?: string[];
  }): Promise<{ success: true; storage: StorageListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      type: body.type,
      category: body.category,
      isDefault: body.isDefault ?? false,
      isActive: body.isActive !== false,
    };
    if (body.code != null && body.code !== "") {
      payload.code = body.code;
    }
    if (body.branchId != null && body.branchId !== "") {
      payload.branchId = body.branchId;
    } else {
      payload.branchId = null;
    }
    if (body.capacity != null && body.capacity !== undefined) {
      payload.capacity = body.capacity;
    }
    if (body.address != null && String(body.address).trim() !== "") {
      payload.address = String(body.address).trim();
    }
    if (body.location != null) {
      payload.location = body.location;
    }
    if (body.laborUnitIds !== undefined) {
      payload.laborUnitIds = body.laborUnitIds;
    }
    try {
      const res = await fetch(apiUrl("storages"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
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
      const inner = data.storage as unknown;
      const s = normalizeStorage(inner ?? data);
      if (!s) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, storage: s };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear almacén";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      name: string;
      code: string | null;
      branchId: string | null;
      type: StorageType;
      category: StorageCategory;
      capacity: number | null;
      address: string | null;
      location: { lat: number; lng: number } | null;
      isDefault: boolean;
      isActive: boolean;
      laborUnitIds?: string[];
    },
  ): Promise<{ success: true; storage: StorageListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      type: body.type,
      category: body.category,
      branchId: body.branchId,
      code: body.code,
      capacity: body.capacity,
      address: body.address,
      location: body.location,
      isDefault: body.isDefault,
      isActive: body.isActive,
    };
    if (body.laborUnitIds !== undefined) {
      payload.laborUnitIds = body.laborUnitIds;
    }
    try {
      const res = await fetch(apiUrl(`storages/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
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
      const inner = data.storage as unknown;
      const s = normalizeStorage(inner ?? data);
      if (!s) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, storage: s };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar almacén";
      return { success: false, error: err };
    }
  }

  static async updatePartial(
    id: string,
    body: { isActive?: boolean },
  ): Promise<{ success: true; storage: StorageListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`storages/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const inner = data.storage as unknown;
      const s = normalizeStorage(inner ?? data);
      if (!s) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, storage: s };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar almacén";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`storages/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
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
