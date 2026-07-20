import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { EmploymentContractView } from "../types/contract.types";

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

export class EmploymentContractRequest {
  static async list(employeeId: string): Promise<EmploymentContractView[]> {
    const res = await fetch(apiUrl(`/employees/${employeeId}/contracts`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return (data.data as EmploymentContractView[]) ?? [];
  }

  static async getActive(
    employeeId: string,
  ): Promise<EmploymentContractView | null> {
    const res = await fetch(
      apiUrl(`/employees/${employeeId}/contracts/active`),
      { headers: await authHeaders(), cache: "no-store" },
    );
    const data = await parseJson(res);
    return (data.data as EmploymentContractView) ?? null;
  }

  static async create(
    employeeId: string,
    body: Record<string, unknown>,
  ): Promise<EmploymentContractView> {
    const res = await fetch(apiUrl(`/employees/${employeeId}/contracts`), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as EmploymentContractView;
  }

  static async update(
    contractId: string,
    body: Record<string, unknown>,
  ): Promise<EmploymentContractView> {
    const res = await fetch(apiUrl(`/employees/contracts/${contractId}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as EmploymentContractView;
  }

  static async activate(contractId: string): Promise<EmploymentContractView> {
    const res = await fetch(
      apiUrl(`/employees/contracts/${contractId}/activate`),
      { method: "POST", headers: await authHeaders() },
    );
    const data = await parseJson(res);
    return data.data as EmploymentContractView;
  }
}
