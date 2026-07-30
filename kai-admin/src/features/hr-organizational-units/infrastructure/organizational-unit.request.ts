import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateOrganizationalUnitInput,
  OrganizationalUnitListItem,
  OrganizationalUnitsListResult,
  UpdateOrganizationalUnitInput,
} from "../types/organizational-unit.types";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
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

export class OrganizationalUnitRequest {
  static async list(opts: {
    includeInactive?: boolean;
    unitType?: string;
    branchId?: string;
    companyId?: string;
    resultCenterId?: string;
  } = {}): Promise<OrganizationalUnitListItem[]> {
    const params = new URLSearchParams();
    if (opts.includeInactive) params.set("includeInactive", "true");
    if (opts.unitType) params.set("unitType", opts.unitType);
    if (opts.branchId) params.set("branchId", opts.branchId);
    if (opts.companyId) params.set("companyId", opts.companyId);
    if (opts.resultCenterId) params.set("resultCenterId", opts.resultCenterId);
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`organizational-units${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(
        `No se pudieron listar unidades organizativas (HTTP ${res.status})`,
      );
    }
    const json = (await res.json()) as OrganizationalUnitsListResult;
    if (!json.success || !Array.isArray(json.data)) {
      return [];
    }
    return json.data;
  }

  static async create(
    body: CreateOrganizationalUnitInput,
  ): Promise<OrganizationalUnitListItem> {
    const res = await fetch(apiUrl("organizational-units"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as OrganizationalUnitListItem;
  }

  static async update(
    id: string,
    body: UpdateOrganizationalUnitInput,
  ): Promise<OrganizationalUnitListItem> {
    const res = await fetch(apiUrl(`organizational-units/${id}`), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as OrganizationalUnitListItem;
  }
}
