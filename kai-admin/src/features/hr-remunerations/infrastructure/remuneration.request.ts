import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { RemunerationGridRow, RemunerationListResult } from "../types/remuneration.types";
import type { PayrollSettlementPaymentPayload } from "../types/payroll-settlement-payment.types";

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

export class RemunerationRequest {
  static async list(opts: {
    employeeId?: string;
    status?: string;
  } = {}): Promise<RemunerationGridRow[]> {
    const params = new URLSearchParams();
    if (opts.employeeId) params.set("employeeId", opts.employeeId);
    if (opts.status) params.set("status", opts.status);
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`remunerations${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudieron listar remuneraciones (HTTP ${res.status})`);
    }
    const json = (await res.json()) as RemunerationListResult;
    if (!json.success || !Array.isArray(json.data)) {
      return [];
    }
    return json.data as RemunerationGridRow[];
  }

  static async getById(id: string): Promise<RemunerationGridRow | null> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`remunerations/${encodeURIComponent(id)}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`No se pudo cargar la liquidación (HTTP ${res.status})`);
    }
    const json = (await res.json()) as { success?: boolean; data?: RemunerationGridRow };
    if (!json.success || !json.data) return null;
    return json.data;
  }

  static async listSuggestions(opts: {
    employeeId?: string;
    periodStart?: string;
    periodEnd?: string;
    status?: string;
  } = {}): Promise<
    Array<{
      id: string;
      employeeId: string;
      typeId: string;
      amountCents: string;
      description: string | null;
      status: string;
    }>
  > {
    const params = new URLSearchParams();
    if (opts.employeeId) params.set("employeeId", opts.employeeId);
    if (opts.periodStart) params.set("periodStart", opts.periodStart);
    if (opts.periodEnd) params.set("periodEnd", opts.periodEnd);
    if (opts.status) params.set("status", opts.status);
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`remunerations/suggestions${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (!json.success || !Array.isArray(json.data)) return [];
    return json.data as Array<{
      id: string;
      employeeId: string;
      typeId: string;
      amountCents: string;
      description: string | null;
      status: string;
    }>;
  }

  static async previewSettlement(payload: {
    employeeId: string;
    date?: string;
    lines?: Array<{ typeId: string; amount: number }>;
    includeContractAllowances?: boolean;
  }): Promise<{
    suggestedEarnings: Array<{ typeId: string; amount: number }>;
    suggestedDeductions: Array<{ typeId: string; amount: number; label?: string }>;
    employerCosts: Array<{
      code: string;
      label: string;
      ratePercent: number;
      base: number;
      amount: number;
    }>;
    totals: {
      totalImponible: number;
      totalNoImponible: number;
      totalEarnings: number;
      totalDeductions: number;
      totalEmployerCost: number;
      netPayment: number;
      taxableBase: number;
    };
    note?: string;
  }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("remunerations/preview-settlement"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      data?: {
        suggestedEarnings?: Array<{ typeId: string; amount: number }>;
        suggestedDeductions?: Array<{ typeId: string; amount: number; label?: string }>;
        employerCosts?: Array<{
          code: string;
          label: string;
          ratePercent: number;
          base: number;
          amount: number;
        }>;
        totals?: {
          totalImponible: number;
          totalNoImponible: number;
          totalEarnings: number;
          totalDeductions: number;
          totalEmployerCost: number;
          netPayment: number;
          taxableBase: number;
        };
        note?: string;
      };
    };
    if (!res.ok) {
      throw new Error(
        json.message || `No se pudo previsualizar la liquidación (HTTP ${res.status})`,
      );
    }
    if (!json.success || !json.data) {
      throw new Error(json.message || "Respuesta inválida al previsualizar liquidación.");
    }
    return {
      suggestedEarnings: json.data.suggestedEarnings ?? [],
      suggestedDeductions: json.data.suggestedDeductions ?? [],
      employerCosts: json.data.employerCosts ?? [],
      totals: json.data.totals ?? {
        totalImponible: 0,
        totalNoImponible: 0,
        totalEarnings: 0,
        totalDeductions: 0,
        totalEmployerCost: 0,
        netPayment: 0,
        taxableBase: 0,
      },
      note: json.data.note,
    };
  }

  static async create(payload: {
    employeeId: string;
    date: string;
    resultCenterId?: string | null;
    lines: Array<{ typeId: string; amount: number }>;
    plannedPayments?: Array<{ dueDate: string; amount: number }>;
    settlementPayment?: PayrollSettlementPaymentPayload;
    autoCreateOperationalExpenses?: boolean;
    autoSuggestStatutory?: boolean;
  }): Promise<{ success: true; id: string; documentNumber?: string | null } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("remunerations"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        employeeId: payload.employeeId,
        date: payload.date,
        resultCenterId: payload.resultCenterId ?? undefined,
        lines: payload.lines,
        plannedPayments: payload.plannedPayments,
        settlementPayment: payload.settlementPayment ?? {
          mode: "PENDING",
          paidLines: [],
          scheduledLines: [],
        },
        autoCreateOperationalExpenses: payload.autoCreateOperationalExpenses ?? true,
        autoSuggestStatutory: payload.autoSuggestStatutory ?? true,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      data?: { id?: string; documentNumber?: string | null };
    };
    if (!res.ok) {
      return {
        success: false,
        error: json.message || `No se pudo crear la remuneración (HTTP ${res.status})`,
      };
    }
    const id = json.data?.id;
    if (!json.success || !id) {
      return { success: false, error: json.message || "Respuesta inválida al crear remuneración." };
    }
    return { success: true, id, documentNumber: json.data?.documentNumber ?? null };
  }
}
