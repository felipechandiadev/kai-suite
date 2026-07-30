import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateLaborUnitInput,
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

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.message === "string" ? data.message : `Error HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
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
    return (data.data as LaborUnitView[]) ?? [];
  }

  static async create(body: CreateLaborUnitInput): Promise<LaborUnitView> {
    const res = await fetch(apiUrl("/hr/labor-units"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as LaborUnitView;
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
    return data.data as LaborUnitView;
  }

  static async setStorages(
    id: string,
    storageIds: string[],
  ): Promise<LaborUnitView> {
    const res = await fetch(apiUrl(`/hr/labor-units/${id}/storages`), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ storageIds }),
    });
    const data = await parseJson(res);
    return data.data as LaborUnitView;
  }
}
