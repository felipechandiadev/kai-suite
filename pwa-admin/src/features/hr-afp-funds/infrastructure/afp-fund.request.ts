import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { AfpFundView, CreateAfpFundInput } from "../types/afp-fund.types";

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

export class AfpFundRequest {
  static async list(includeInactive = false): Promise<AfpFundView[]> {
    const q = includeInactive ? "?includeInactive=1" : "";
    const res = await fetch(apiUrl(`/hr/afp-funds${q}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return (data.data as AfpFundView[]) ?? [];
  }

  static async create(body: CreateAfpFundInput): Promise<AfpFundView> {
    const res = await fetch(apiUrl("/hr/afp-funds"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as AfpFundView;
  }

  static async update(
    id: string,
    body: Partial<CreateAfpFundInput>,
  ): Promise<AfpFundView> {
    const res = await fetch(apiUrl(`/hr/afp-funds/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as AfpFundView;
  }
}
