import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  AccountsReceivableListForGridInput,
  AccountsReceivableListForGridResult,
  AccountsReceivablePaymentContext,
  AccountsReceivableRow,
  CompleteAccountsReceivablePaymentInput,
} from "../types/accounts-receivable.types";

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

export class AccountsReceivableRequest {
  static async listForGrid(
    input: AccountsReceivableListForGridInput = {},
  ): Promise<AccountsReceivableListForGridResult> {
    const page = Math.max(1, Math.round(input.page ?? 1));
    const limit = Math.min(200, Math.max(1, Math.round(input.limit ?? 25)));
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(limit));
    if (input.search?.trim()) params.set("search", input.search.trim());
    if (input.status) params.set("status", input.status);
    if (input.fromDate) params.set("fromDate", input.fromDate);
    if (input.toDate) params.set("toDate", input.toDate);
    if (input.overdueOnly) params.set("overdueOnly", "true");
    if (input.includePaid) params.set("includePaid", "true");

    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`accounts-receivable${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudieron cargar las cuentas por cobrar (HTTP ${res.status})`);
    }
    const json = (await res.json()) as {
      rows?: AccountsReceivableRow[];
      total?: number;
      page?: number;
      pageSize?: number;
    };
    return {
      rows: Array.isArray(json.rows) ? json.rows : [],
      total: Number(json.total ?? 0),
    };
  }

  static async getPaymentContext(installmentId: string): Promise<AccountsReceivablePaymentContext> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`accounts-receivable/${installmentId}/payment-context`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el contexto de cobro (HTTP ${res.status})`);
    }
    return (await res.json()) as AccountsReceivablePaymentContext;
  }

  static async completePayment(
    input: CompleteAccountsReceivablePaymentInput,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`accounts-receivable/${input.installmentId}/complete`), {
      method: "POST",
      headers,
      body: JSON.stringify({
        paymentMethod: input.paymentMethod,
        companyAccountKey: input.companyAccountKey,
        cashHubId: input.cashHubId,
        note: input.note,
        amount: input.amount,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
    };
    if (!res.ok) {
      return {
        success: false,
        error: json.message || `No se pudo registrar el cobro (HTTP ${res.status})`,
      };
    }
    if (json.success === false) {
      return { success: false, error: json.message || "Error al registrar el cobro." };
    }
    return { success: true };
  }
}
