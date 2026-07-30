import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  AccountsPayableListFilters,
  AccountsPayableListResult,
  AccountsPayableRow,
  AccountsPayablePaymentContext,
  CompleteAccountsPayablePaymentInput,
} from "../types/accounts-payable.types";

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

export class AccountsPayableRequest {
  static async list(filters: AccountsPayableListFilters = {}): Promise<AccountsPayableListResult> {
    const params = new URLSearchParams();
    if (filters.paymentType) params.set("paymentType", filters.paymentType);
    if (filters.sourceType) params.set("sourceType", filters.sourceType);
    if (filters.status) params.set("status", filters.status);
    if (filters.payeeType) params.set("payeeType", filters.payeeType);
    if (filters.fromDate) params.set("fromDate", filters.fromDate);
    if (filters.toDate) params.set("toDate", filters.toDate);
    if (filters.overdueOnly) params.set("overdueOnly", "true");
    if (filters.search?.trim()) params.set("search", filters.search.trim());

    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`accounts-payable${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudieron cargar las cuentas por pagar (HTTP ${res.status})`);
    }
    const json = (await res.json()) as AccountsPayableRow[];
    return {
      items: Array.isArray(json) ? json : [],
    };
  }

  static async getPaymentContext(paymentId: string): Promise<AccountsPayablePaymentContext> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`accounts-payable/${paymentId}/payment-context`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el contexto de pago (HTTP ${res.status})`);
    }
    return (await res.json()) as AccountsPayablePaymentContext;
  }

  static async completePayment(
    input: CompleteAccountsPayablePaymentInput,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`accounts-payable/${input.paymentId}/complete`), {
      method: "POST",
      headers,
      body: JSON.stringify({
        paymentMethod: input.paymentMethod,
        bankAccountKey: input.bankAccountKey,
        cashHubId: input.cashHubId,
        companyBankAccount: input.companyBankAccount,
        supplierBankAccount: input.supplierBankAccount,
        note: input.note,
        checkData: input.checkData,
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
        error: json.message || `No se pudo registrar el pago (HTTP ${res.status})`,
      };
    }
    if (json.success === false) {
      return { success: false, error: json.message || "Error al registrar el pago." };
    }
    return { success: true };
  }

  static async getTransactionById(transactionId: string): Promise<Record<string, unknown>> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`transactions/${transactionId}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar la transacción (HTTP ${res.status})`);
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json || typeof json !== "object") {
      throw new Error("Respuesta inválida al cargar transacción.");
    }
    return json;
  }
}
