import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyTipSettings } from "../types/company-tips.types";

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
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export type TipLedgerEntryView = {
  id: string;
  companyId: string;
  branchId?: string | null;
  saleTransactionId: string;
  diningOrderId?: string | null;
  amount: string | number;
  status: string;
  tipStatus: string;
  suggestPercent?: string | number | null;
  suggestedAmount?: string | number | null;
  paymentMethod?: string | null;
  employeeId?: string | null;
  createdAt: string;
};

export type TipSummaryView = {
  accruedTotal: number;
  accruedCount: number;
  byDay: Array<{ date: string; total: number; count: number }>;
};

export const KaifoodTipsRequest = {
  async getActive(): Promise<CompanyTipSettings | null> {
    try {
      const res = await fetch(apiUrl("/company/tip-settings"), {
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        tipSettings?: CompanyTipSettings;
      };
      if (!res.ok || !data.tipSettings) return null;
      return data.tipSettings;
    } catch {
      return null;
    }
  },

  async get(companyId: string): Promise<
    | { success: true; tipSettings: CompanyTipSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/tip-settings`),
        { headers: await authHeaders(), cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        tipSettings?: CompanyTipSettings;
        message?: string;
      };
      if (!res.ok || !data.tipSettings) {
        return {
          success: false,
          error: data.message || res.statusText || "Error tip-settings",
        };
      }
      return { success: true, tipSettings: data.tipSettings };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error tip-settings",
      };
    }
  },

  async replace(
    companyId: string,
    tipSettings: CompanyTipSettings,
  ): Promise<
    | { success: true; tipSettings: CompanyTipSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/tip-settings`),
        {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ tipSettings }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        tipSettings?: CompanyTipSettings;
        message?: string;
      };
      if (!res.ok || !data.tipSettings) {
        return {
          success: false,
          error: data.message || res.statusText || "Error al guardar",
        };
      }
      return { success: true, tipSettings: data.tipSettings };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al guardar",
      };
    }
  },

  async listLedger(params?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Promise<TipLedgerEntryView[]> {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
    if (params?.dateTo) q.set("dateTo", params.dateTo);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    const res = await fetch(apiUrl(`/tips/ledger${qs ? `?${qs}` : ""}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: TipLedgerEntryView[];
    };
    if (!res.ok) return [];
    return data.data ?? [];
  },

  async summary(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<TipSummaryView | null> {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
    if (params?.dateTo) q.set("dateTo", params.dateTo);
    const qs = q.toString();
    const res = await fetch(apiUrl(`/tips/summary${qs ? `?${qs}` : ""}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: TipSummaryView;
    };
    if (!res.ok) return null;
    return data.data ?? null;
  },
};
