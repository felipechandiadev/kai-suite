import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  AutomationRuleDto,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from "../types/automation.types";

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
  const m = data.message;
  if (Array.isArray(m)) return m.map(String).join("; ");
  if (typeof m === "string" && m.trim()) return m.trim();
  return res.statusText;
}

function normalizeRule(row: unknown): AutomationRuleDto | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  const eventType = o.eventType != null ? String(o.eventType) : "";
  if (!id || !companyId || !eventType) return null;
  const actionsRaw = Array.isArray(o.actions) ? (o.actions as unknown[]) : [];
  const actions = actionsRaw
    .map((a) => {
      if (!a || typeof a !== "object") return null;
      const ao = a as Record<string, unknown>;
      const aid = ao.id != null ? String(ao.id) : "";
      const ruleId = ao.ruleId != null ? String(ao.ruleId) : "";
      const type = ao.type != null ? String(ao.type) : "";
      if (!aid || !ruleId || !type) return null;
      return {
        id: aid,
        ruleId,
        type: type as any,
        params: (ao.params && typeof ao.params === "object" ? (ao.params as Record<string, unknown>) : null) as any,
        sortOrder: typeof ao.sortOrder === "number" ? ao.sortOrder : Number(ao.sortOrder ?? 0) || 0,
        isActive: ao.isActive !== false,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return {
    id,
    companyId,
    eventType: eventType as any,
    filters: (o.filters && typeof o.filters === "object" ? (o.filters as Record<string, unknown>) : null) as any,
    priority: typeof o.priority === "number" ? o.priority : Number(o.priority ?? 0) || 0,
    isActive: o.isActive !== false,
    actions,
  };
}

export class AutomationRequest {
  static async list(companyId: string): Promise<
    { success: true; rules: AutomationRuleDto[] } | { success: false; error: string; rules: [] }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(
        apiUrl(`automation/rules?companyId=${encodeURIComponent(companyId)}`),
        {
          method: "GET",
          headers,
          cache: "no-store",
        },
      );
      if (!res.ok) {
        return { success: false, error: await errorMessage(res), rules: [] };
      }
      const json = (await res.json()) as any;
      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const rules = (data as unknown[])
        .map(normalizeRule)
        .filter((x: AutomationRuleDto | null): x is AutomationRuleDto => x != null);
      return { success: true, rules };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar automatizaciones";
      return { success: false, error: err, rules: [] };
    }
  }

  static async create(companyId: string, input: CreateAutomationRuleInput) {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("automation/rules"), {
        method: "POST",
        headers,
        body: JSON.stringify({ companyId, ...input }),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || json?.success === false) {
        return { success: false as const, error: json?.message ? String(json.message) : await errorMessage(res) };
      }
      const rule = normalizeRule(json.data ?? json.rule ?? json);
      if (!rule) return { success: false as const, error: "Respuesta inválida del servidor" };
      return { success: true as const, rule };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear regla";
      return { success: false as const, error: err };
    }
  }

  static async update(input: UpdateAutomationRuleInput) {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`automation/rules/${encodeURIComponent(input.id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...input, id: undefined }),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || json?.success === false) {
        return { success: false as const, error: json?.message ? String(json.message) : await errorMessage(res) };
      }
      const rule = normalizeRule(json.data ?? json.rule ?? json);
      if (!rule) return { success: false as const, error: "Respuesta inválida del servidor" };
      return { success: true as const, rule };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar regla";
      return { success: false as const, error: err };
    }
  }

  static async remove(id: string) {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`automation/rules/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || json?.success === false) {
        return { success: false as const, error: json?.message ? String(json.message) : await errorMessage(res) };
      }
      return { success: true as const };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al desactivar regla";
      return { success: false as const, error: err };
    }
  }
}

