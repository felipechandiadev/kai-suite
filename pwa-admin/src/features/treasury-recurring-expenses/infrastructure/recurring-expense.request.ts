import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  RecurringExpenseCreatePayload,
  RecurringExpenseFrequency,
  RecurringExpenseListItem,
  RecurringExpenseRunItem,
  RecurringExpenseUpdatePayload,
} from "../types/recurring-expense.types";

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

function supplierLabel(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "—";
  const s = raw as Record<string, unknown>;
  const person =
    s.person && typeof s.person === "object"
      ? (s.person as Record<string, unknown>)
      : null;
  const alias = s.alias != null ? String(s.alias).trim() : "";
  const businessName =
    person?.businessName != null ? String(person.businessName).trim() : "";
  const fullName = [person?.firstName, person?.lastName]
    .filter(Boolean)
    .map(String)
    .join(" ")
    .trim();
  return alias || businessName || fullName || "—";
}

function normalizeRow(row: unknown): RecurringExpenseListItem | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  const name = o.name != null ? String(o.name).trim() : "";
  const categoryId = o.categoryId != null ? String(o.categoryId) : "";
  const supplierId = o.supplierId != null ? String(o.supplierId) : "";
  const frequency = String(o.frequency ?? "") as RecurringExpenseFrequency;
  if (!id || !companyId || !name || !categoryId || !supplierId) return null;
  if (!["WEEKLY", "MONTHLY", "YEARLY"].includes(frequency)) return null;

  let categoryName = "—";
  if (o.category && typeof o.category === "object") {
    const c = o.category as Record<string, unknown>;
    if (c.name != null && String(c.name).trim()) categoryName = String(c.name).trim();
  }

  return {
    id,
    companyId,
    name,
    description: o.description != null ? String(o.description) : null,
    categoryId,
    categoryName,
    supplierId,
    supplierName: supplierLabel(o.supplier),
    amountNet: Number(o.amountNet) || 0,
    taxAmount: Number(o.taxAmount) || 0,
    total: Number(o.total) || 0,
    frequency,
    dayOfWeek: o.dayOfWeek != null ? Number(o.dayOfWeek) : null,
    dayOfMonth: o.dayOfMonth != null ? Number(o.dayOfMonth) : null,
    nextRunAt: o.nextRunAt != null ? String(o.nextRunAt) : "",
    lastRunAt: o.lastRunAt != null ? String(o.lastRunAt) : null,
    isActive: o.isActive !== false,
  };
}

function normalizeRun(row: unknown): RecurringExpenseRunItem | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const periodKey = o.periodKey != null ? String(o.periodKey) : "";
  const status = String(o.status ?? "");
  if (!id || !periodKey || (status !== "SUCCESS" && status !== "FAILED")) return null;
  return {
    id,
    periodKey,
    operationalExpenseId:
      o.operationalExpenseId != null ? String(o.operationalExpenseId) : null,
    status,
    errorMessage: o.errorMessage != null ? String(o.errorMessage) : null,
    ranAt: o.ranAt != null ? String(o.ranAt) : "",
  };
}

export class RecurringExpenseRequest {
  static async list(companyId: string): Promise<{
    success: boolean;
    rows: RecurringExpenseListItem[];
    error?: string;
  }> {
    try {
      const res = await fetch(
        apiUrl(`/recurring-operating-expenses?companyId=${encodeURIComponent(companyId)}&limit=200`),
        { headers: await authHeaders(), cache: "no-store" },
      );
      if (!res.ok) {
        return { success: false, rows: [], error: await res.text() };
      }
      const json = (await res.json()) as { data?: unknown[] };
      const rows = (json.data ?? [])
        .map(normalizeRow)
        .filter((x): x is RecurringExpenseListItem => Boolean(x));
      return { success: true, rows };
    } catch (e) {
      return {
        success: false,
        rows: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  static async listRuns(id: string): Promise<{
    success: boolean;
    rows: RecurringExpenseRunItem[];
    error?: string;
  }> {
    try {
      const res = await fetch(apiUrl(`/recurring-operating-expenses/${id}/runs`), {
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, rows: [], error: await res.text() };
      }
      const json = (await res.json()) as unknown;
      const arr = Array.isArray(json) ? json : [];
      const rows = arr
        .map(normalizeRun)
        .filter((x): x is RecurringExpenseRunItem => Boolean(x));
      return { success: true, rows };
    } catch (e) {
      return {
        success: false,
        rows: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  static async create(
    companyId: string,
    createdBy: string,
    input: RecurringExpenseCreatePayload,
  ): Promise<{ success: true; id: string } | { success: false; error: string }> {
    try {
      const res = await fetch(apiUrl("/recurring-operating-expenses"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          companyId,
          createdBy,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          supplierId: input.supplierId,
          amountNet: input.amountNet,
          taxAmount: input.taxAmount,
          total: input.total,
          frequency: input.frequency,
          dayOfWeek: input.dayOfWeek,
          dayOfMonth: input.dayOfMonth,
          isActive: input.isActive ?? true,
        }),
      });
      if (!res.ok) {
        return { success: false, error: await res.text() };
      }
      const json = (await res.json()) as { id?: string };
      if (!json.id) return { success: false, error: "Respuesta sin id" };
      return { success: true, id: json.id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  static async update(
    input: RecurringExpenseUpdatePayload,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const res = await fetch(apiUrl(`/recurring-operating-expenses/${input.id}`), {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          supplierId: input.supplierId,
          amountNet: input.amountNet,
          taxAmount: input.taxAmount,
          total: input.total,
          frequency: input.frequency,
          dayOfWeek: input.dayOfWeek,
          dayOfMonth: input.dayOfMonth,
          isActive: input.isActive,
        }),
      });
      if (!res.ok) {
        return { success: false, error: await res.text() };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  static async pause(
    id: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const res = await fetch(apiUrl(`/recurring-operating-expenses/${id}/pause`), {
        method: "POST",
        headers: await authHeaders(),
      });
      if (!res.ok) return { success: false, error: await res.text() };
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  static async resume(
    id: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const res = await fetch(apiUrl(`/recurring-operating-expenses/${id}/resume`), {
        method: "POST",
        headers: await authHeaders(),
      });
      if (!res.ok) return { success: false, error: await res.text() };
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  static async generate(
    id: string,
  ): Promise<
    | { success: true; operationalExpenseId?: string; skipped?: boolean }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl(`/recurring-operating-expenses/${id}/generate`), {
        method: "POST",
        headers: await authHeaders(),
      });
      if (!res.ok) return { success: false, error: await res.text() };
      const json = (await res.json()) as {
        skipped?: boolean;
        operationalExpenseId?: string;
        run?: { status?: string; errorMessage?: string };
      };
      if (json.run?.status === "FAILED") {
        return {
          success: false,
          error: json.run.errorMessage || "La generación falló",
        };
      }
      return {
        success: true,
        operationalExpenseId: json.operationalExpenseId,
        skipped: json.skipped,
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
