import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { AnalyticsDashboardResponse } from "../types/analytics.types";

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

export class AnalyticsRequest {
  static async getDashboard(opts?: {
    from?: string;
    to?: string;
    compare?: "previous_period";
    branchId?: string;
    trendMonths?: number;
  }): Promise<AnalyticsDashboardResponse> {
    const params = new URLSearchParams();
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    if (opts?.compare) params.set("compare", opts.compare);
    if (opts?.branchId) params.set("branchId", opts.branchId);
    if (opts?.trendMonths != null) params.set("trendMonths", String(opts.trendMonths));
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`analytics/dashboard${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el panel analítico (HTTP ${res.status})`);
    }
    return (await res.json()) as AnalyticsDashboardResponse;
  }
}
