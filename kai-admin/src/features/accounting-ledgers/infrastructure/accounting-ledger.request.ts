import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { LedgerAccountsListResult } from "../types/ledger-account.types";

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

export class AccountingLedgerRequest {
  static async listAccounts(opts: { includeInactive?: boolean } = {}): Promise<LedgerAccountsListResult> {
    const params = new URLSearchParams();
    if (opts.includeInactive) {
      params.set("includeInactive", "true");
    }
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`accounting/ledger${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el libro contable (HTTP ${res.status})`);
    }
    const json = (await res.json()) as {
      accounts?: LedgerAccountsListResult["accounts"];
    };
    return {
      accounts: Array.isArray(json.accounts) ? json.accounts : [],
    };
  }
}
