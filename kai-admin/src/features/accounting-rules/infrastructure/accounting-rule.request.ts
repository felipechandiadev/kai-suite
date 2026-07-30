import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  AccountingRuleListItem,
  CreateAccountingRuleResult,
  DeleteAccountingRuleResult,
  ListAccountingRulesResult,
  UpdateAccountingRuleResult,
} from "../types/accounting-rule.types";
import type { AccountingRuleLine } from "../types/accounting-rule.types";

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

async function errorMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const m = data.message ?? (data.error as unknown);
  if (Array.isArray(m)) return m.map(String).join("; ");
  if (typeof m === "string" && m.trim()) return m.trim();
  return res.statusText;
}

function normalizeRule(row: unknown): AccountingRuleListItem | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  const appliesTo = o.appliesTo != null ? String(o.appliesTo) : "";
  const transactionType = o.transactionType != null ? String(o.transactionType) : "";
  const debitAccountId = o.debitAccountId != null ? String(o.debitAccountId) : "";
  const creditAccountId = o.creditAccountId != null ? String(o.creditAccountId) : "";
  if (!id || !companyId || !appliesTo || !transactionType || !debitAccountId || !creditAccountId) return null;

  const priorityRaw = o.priority;
  const priority = typeof priorityRaw === "number" ? priorityRaw : Number(priorityRaw ?? 0);

  const expenseCategoryId = o.expenseCategoryId != null && String(o.expenseCategoryId).trim() ? String(o.expenseCategoryId) : null;
  const taxId = o.taxId != null && String(o.taxId).trim() ? String(o.taxId) : null;
  const paymentMethod = o.paymentMethod != null && String(o.paymentMethod).trim() ? String(o.paymentMethod) : null;

  const debitAccountObj = o.debitAccount && typeof o.debitAccount === "object" ? (o.debitAccount as Record<string, unknown>) : null;
  const creditAccountObj = o.creditAccount && typeof o.creditAccount === "object" ? (o.creditAccount as Record<string, unknown>) : null;
  const taxObj = o.tax && typeof o.tax === "object" ? (o.tax as Record<string, unknown>) : null;
  const expenseObj =
    o.expenseCategory && typeof o.expenseCategory === "object"
      ? (o.expenseCategory as Record<string, unknown>)
      : null;

  const linesRaw = Array.isArray(o.lines) ? (o.lines as unknown[]) : [];
  const lines: AccountingRuleLine[] | undefined =
    linesRaw.length > 0
      ? (linesRaw
          .map((lr) => {
            if (!lr || typeof lr !== "object") return null;
            const l = lr as Record<string, unknown>;
            const lid = l.id != null ? String(l.id) : "";
            const ruleId = l.ruleId != null ? String(l.ruleId) : id;
            const side = l.side != null ? String(l.side) : "";
            const accountId = l.accountId != null ? String(l.accountId) : "";
            const amountMode = l.amountMode != null ? String(l.amountMode) : "";
            const amountValueRaw = l.amountValue;
            const amountValue =
              amountValueRaw == null || amountValueRaw === ""
                ? null
                : typeof amountValueRaw === "number"
                  ? amountValueRaw
                  : Number(amountValueRaw);
            const sortOrderRaw = l.sortOrder;
            const sortOrder = typeof sortOrderRaw === "number" ? sortOrderRaw : Number(sortOrderRaw ?? 0);

            const accObj = l.account && typeof l.account === "object" ? (l.account as Record<string, unknown>) : null;

            if (!lid || !side || !accountId || !amountMode) return null;
            const out: AccountingRuleLine = {
              id: lid,
              ruleId,
              side: side as any,
              accountId,
              amountMode: amountMode as any,
              amountValue: Number.isFinite(Number(amountValue)) ? (amountValue as number) : null,
              sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
              isActive: l.isActive !== false,
              account: accObj
                ? {
                    id: String(accObj.id ?? ""),
                    code: accObj.code != null ? String(accObj.code) : undefined,
                    name: accObj.name != null ? String(accObj.name) : undefined,
                  }
                : null,
            };
            return out;
          })
          .filter((x): x is AccountingRuleLine => x != null) as AccountingRuleLine[])
      : undefined;

  return {
    id,
    companyId,
    appliesTo: appliesTo as any,
    transactionType,
    expenseCategoryId,
    taxId,
    paymentMethod,
    debitAccountId,
    creditAccountId,
    lines,
    priority: Number.isFinite(priority) ? priority : 0,
    isActive: o.isActive !== false,
    createdAt: o.createdAt != null ? String(o.createdAt) : undefined,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
    debitAccount: debitAccountObj
      ? { id: String(debitAccountObj.id ?? ""), code: debitAccountObj.code != null ? String(debitAccountObj.code) : undefined, name: debitAccountObj.name != null ? String(debitAccountObj.name) : undefined }
      : null,
    creditAccount: creditAccountObj
      ? { id: String(creditAccountObj.id ?? ""), code: creditAccountObj.code != null ? String(creditAccountObj.code) : undefined, name: creditAccountObj.name != null ? String(creditAccountObj.name) : undefined }
      : null,
    tax: taxObj
      ? { id: String(taxObj.id ?? ""), name: taxObj.name != null ? String(taxObj.name) : undefined, code: taxObj.code != null ? String(taxObj.code) : null }
      : null,
    expenseCategory: expenseObj
      ? { id: String(expenseObj.id ?? ""), name: expenseObj.name != null ? String(expenseObj.name) : undefined, code: expenseObj.code != null ? String(expenseObj.code) : null }
      : null,
  };
}

export class AccountingRuleRequest {
  static async list(companyId: string): Promise<ListAccountingRulesResult> {
    const headers = await authHeaders();
    const q = new URLSearchParams({ companyId });
    try {
      const res = await fetch(apiUrl(`accounting/rules?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) return { success: false, error: await errorMessage(res), rules: [] };
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) return { success: true, rules: [] };
      const rules = json.map(normalizeRule).filter((x): x is AccountingRuleListItem => x != null);
      return { success: true, rules };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Error al listar reglas", rules: [] };
    }
  }

  static async create(payload: Record<string, unknown>): Promise<CreateAccountingRuleResult> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("accounting/rules"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        return { success: false, error: typeof (data as any)?.message === "string" ? (data as any).message : await errorMessage(res) };
      }
      const rule = normalizeRule(data);
      if (!rule) return { success: false, error: "Respuesta inválida del servidor" };
      return { success: true, rule };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Error al crear regla" };
    }
  }

  static async update(id: string, payload: Record<string, unknown>): Promise<UpdateAccountingRuleResult> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`accounting/rules/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) return { success: false, error: typeof (data as any)?.message === "string" ? (data as any).message : await errorMessage(res) };
      const rule = normalizeRule(data);
      if (!rule) return { success: false, error: "Respuesta inválida del servidor" };
      return { success: true, rule };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Error al actualizar regla" };
    }
  }

  static async remove(id: string): Promise<DeleteAccountingRuleResult> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`accounting/rules/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) return { success: false, error: await errorMessage(res) };
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Error al desactivar regla" };
    }
  }
}

