import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  SalesCommissionsSalesPage,
  SalesCommissionsSummary,
} from "../types/sales-commissions.types";

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

export class EmployeeSalesCommissionsRequest {
  static async getSummary(
    employeeId: string,
    months = 12,
  ): Promise<SalesCommissionsSummary> {
    const q = new URLSearchParams();
    q.set("months", String(months));
    const res = await fetch(
      apiUrl(`/employees/${employeeId}/sales-commissions/summary?${q}`),
      { headers: await authHeaders(), cache: "no-store" },
    );
    const data = await parseJson(res);
    return (data.data as SalesCommissionsSummary) ?? {
      enabled: false,
      percent: null,
      linked: false,
      userIds: [],
      months: [],
    };
  }

  static async listSales(params: {
    employeeId: string;
    yearMonth: string;
    page?: number;
    limit?: number;
  }): Promise<SalesCommissionsSalesPage> {
    const q = new URLSearchParams();
    q.set("yearMonth", params.yearMonth);
    q.set("page", String(params.page ?? 1));
    q.set("limit", String(params.limit ?? 25));
    const res = await fetch(
      apiUrl(
        `/employees/${params.employeeId}/sales-commissions/sales?${q.toString()}`,
      ),
      { headers: await authHeaders(), cache: "no-store" },
    );
    const data = await parseJson(res);
    return (data.data as SalesCommissionsSalesPage) ?? {
      enabled: false,
      percent: null,
      linked: false,
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    };
  }
}
