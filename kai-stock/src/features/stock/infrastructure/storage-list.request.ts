import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type { StorageCategory, StorageListItem, StorageType } from "../types/storage-list.types";
import { STORAGE_CATEGORIES, STORAGE_TYPES } from "../types/storage-list.types";

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

export class StorageListRequest {
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
}
