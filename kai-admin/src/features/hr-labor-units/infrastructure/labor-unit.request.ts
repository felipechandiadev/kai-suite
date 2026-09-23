import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateLaborUnitInput,
  LaborUnitAssociationsInput,
  LaborUnitNamedLink,
  LaborUnitView,
} from "../types/labor-unit.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function apiErrorMessage(data: Record<string, unknown>, status: number): string {
  const m = data.message;
  if (typeof m === "string" && m.trim()) return m;
  if (Array.isArray(m) && m.length) return m.map(String).join(" ");
  return `Error HTTP ${status}`;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, res.status));
  }
  return data;
}

function namedLinks(raw: unknown): LaborUnitNamedLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row): LaborUnitNamedLink | null => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      if (!id) return null;
      return { id, name: o.name != null ? String(o.name) : id };
    })
    .filter((x): x is LaborUnitNamedLink => x != null);
}

function idList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x)).filter(Boolean);
}

function mapLaborUnit(raw: unknown): LaborUnitView | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const branches = namedLinks(o.branches);
  const storages = namedLinks(o.storages);
  const organizationalUnits = namedLinks(o.organizationalUnits);
  const productionUnits = namedLinks(o.productionUnits);
  return {
    id,
    companyId: o.companyId != null ? String(o.companyId) : "",
    code: o.code != null ? String(o.code) : "",
    name: o.name != null ? String(o.name) : "",
    description: o.description != null ? String(o.description) : null,
    isActive: o.isActive !== false,
    branchIds: idList(o.branchIds).length ? idList(o.branchIds) : branches.map((b) => b.id),
    branches,
    storageIds: idList(o.storageIds).length ? idList(o.storageIds) : storages.map((s) => s.id),
    storages,
    organizationalUnitIds: idList(o.organizationalUnitIds).length
      ? idList(o.organizationalUnitIds)
      : organizationalUnits.map((u) => u.id),
    organizationalUnits,
    productionUnitIds: idList(o.productionUnitIds).length
      ? idList(o.productionUnitIds)
      : productionUnits.map((p) => p.id),
    productionUnits,
    createdAt: o.createdAt != null ? String(o.createdAt) : "",
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : "",
  };
}

export class LaborUnitRequest {
  static async list(opts?: {
    includeInactive?: boolean;
    branchId?: string | null;
  }): Promise<LaborUnitView[]> {
    const q = new URLSearchParams();
    if (opts?.includeInactive) q.set("includeInactive", "1");
    if (opts?.branchId) q.set("branchId", opts.branchId);
    const qs = q.toString() ? `?${q}` : "";
    const res = await fetch(apiUrl(`/hr/labor-units${qs}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    const rows = Array.isArray(data.data) ? data.data : [];
    return rows.map(mapLaborUnit).filter((x): x is LaborUnitView => x != null);
  }

  static async create(body: CreateLaborUnitInput): Promise<LaborUnitView> {
    const res = await fetch(apiUrl("/hr/labor-units"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    const mapped = mapLaborUnit(data.data);
    if (!mapped) throw new Error("Respuesta inválida al crear unidad laboral");
    return mapped;
  }

  static async update(
    id: string,
    body: Partial<CreateLaborUnitInput>,
  ): Promise<LaborUnitView> {
    const res = await fetch(apiUrl(`/hr/labor-units/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    const mapped = mapLaborUnit(data.data);
    if (!mapped) throw new Error("Respuesta inválida al actualizar unidad laboral");
    return mapped;
  }

  static async setAssociations(
    id: string,
    body: LaborUnitAssociationsInput,
  ): Promise<LaborUnitView> {
    const res = await fetch(apiUrl(`/hr/labor-units/${id}/associations`), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    const mapped = mapLaborUnit(data.data);
    if (!mapped) throw new Error("Respuesta inválida al guardar asociaciones");
    return mapped;
  }
}
