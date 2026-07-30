import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

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

export class TreasuryOperationsRequest {
  static async postCapitalContribution(body: {
    shareholderId: string;
    bankAccountKey?: string;
    cashHubId?: string;
    amount: number;
    notes?: string;
  }) {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("capital-contributions"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = typeof data.error === "string" ? data.error : JSON.stringify(data);
      throw new Error(err || `HTTP ${res.status}`);
    }
    if (data.success === false) {
      throw new Error(typeof data.error === "string" ? data.error : "Error en aporte de capital");
    }
    return data;
  }

  static async postDividendWithdrawal(body: {
    shareholderId: string;
    bankAccountKey: string;
    amount: number;
    notes?: string;
    taxRetention?: number;
  }) {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("bank-withdrawals"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = typeof data.error === "string" ? data.error : JSON.stringify(data);
      throw new Error(err || `HTTP ${res.status}`);
    }
    if (data.success === false) {
      throw new Error(typeof data.error === "string" ? data.error : "Error en retiro de utilidades");
    }
    return data;
  }

  static async postCashDeposit(body: {
    bankAccountKey: string;
    cashHubId: string;
    amount: number;
    notes?: string;
  }) {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("cash-deposits"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = typeof data.error === "string" ? data.error : JSON.stringify(data);
      throw new Error(err || `HTTP ${res.status}`);
    }
    if (data.success === false) {
      throw new Error(typeof data.error === "string" ? data.error : "Error en depósito desde caja");
    }
    return data;
  }

  static async postBankToCashHubTransfer(body: {
    bankAccountKey: string;
    cashHubId: string;
    amount: number;
    notes?: string;
  }) {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("bank-transfers"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = typeof data.error === "string" ? data.error : JSON.stringify(data);
      throw new Error(err || `HTTP ${res.status}`);
    }
    if (data.success === false) {
      throw new Error(typeof data.error === "string" ? data.error : "Error en giro a centro de efectivo");
    }
    return data;
  }
}
