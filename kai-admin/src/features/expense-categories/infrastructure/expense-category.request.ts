import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  ExpenseCategoryListItem,
  ExpenseCategoryOperationalGroupValue,
  ExpenseCategoryPnlNatureValue,
  OperationalGroupMetaItem,
} from "../types/expense-category.types";

const GROUP_VALUES: readonly ExpenseCategoryOperationalGroupValue[] = [
  "PERSONAL_NOMINA",
  "LOCALES_INSTALACIONES",
  "SUMINISTROS_CONSUMIBLES",
  "LOGISTICA_DISTRIBUCION",
  "TECNOLOGIA_SISTEMAS",
  "COMUNICACION_MARKETING_OPERATIVO",
  "SERVICIOS_EXTERNOS",
  "FINANCIEROS_TESORERIA",
  "PERDIDAS_AJUSTES_OPERATIVOS",
  "REGULATORIO_CUMPLIMIENTO",
];

const PNL_VALUES: readonly ExpenseCategoryPnlNatureValue[] = ["SALES", "ADMIN"];

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
  if (Array.isArray(m)) {
    return m.map(String).join("; ");
  }
  if (typeof m === "string" && m.trim()) {
    return m.trim();
  }
  return res.statusText;
}

function parseThreshold(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (raw == null || String(raw).trim() === "") {
    return 0;
  }
  const n = Number(String(raw));
  return Number.isFinite(n) ? n : 0;
}

function parseOperationalGroup(raw: unknown): ExpenseCategoryOperationalGroupValue {
  const s = raw != null ? String(raw).trim() : "";
  if ((GROUP_VALUES as readonly string[]).includes(s)) {
    return s as ExpenseCategoryOperationalGroupValue;
  }
  return "PERDIDAS_AJUSTES_OPERATIVOS";
}

function parsePnlNature(raw: unknown): ExpenseCategoryPnlNatureValue {
  const s = raw != null ? String(raw).trim() : "";
  if ((PNL_VALUES as readonly string[]).includes(s)) {
    return s as ExpenseCategoryPnlNatureValue;
  }
  return "ADMIN";
}

function normalizeMetaRow(row: unknown): OperationalGroupMetaItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const value = parseOperationalGroup(o.value);
  const label = o.label != null ? String(o.label).trim() : "";
  const description = o.description != null ? String(o.description).trim() : "";
  if (!label) {
    return null;
  }
  return { value, label, description };
}

export function normalizeExpenseCategory(row: unknown): ExpenseCategoryListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  const codeRaw = o.code != null ? String(o.code).trim() : "";
  const code = codeRaw !== "" ? codeRaw : null;
  const name = o.name != null ? String(o.name).trim() : "";
  if (!id || !companyId || !name) {
    return null;
  }
  const drc = o.defaultResultCenter;
  let defaultResultCenterId: string | null = null;
  let defaultResultCenterName: string | null = null;
  if (drc && typeof drc === "object") {
    const rc = drc as Record<string, unknown>;
    if (rc.id != null) {
      defaultResultCenterId = String(rc.id);
    }
    if (rc.name != null && String(rc.name).trim()) {
      defaultResultCenterName = String(rc.name).trim();
    }
  } else if (o.defaultResultCenterId != null && String(o.defaultResultCenterId).trim()) {
    defaultResultCenterId = String(o.defaultResultCenterId).trim();
  }

  const descRaw = o.description;
  const description =
    descRaw != null && String(descRaw).trim() !== "" ? String(descRaw).trim() : null;

  return {
    id,
    companyId,
    code,
    name,
    operationalExpenseGroup: parseOperationalGroup(o.operationalExpenseGroup),
    pnlNature: parsePnlNature(o.pnlNature),
    description,
    requiresApproval: o.requiresApproval === true,
    approvalThreshold: parseThreshold(o.approvalThreshold),
    defaultResultCenterId,
    defaultResultCenterName,
    isActive: o.isActive !== false,
    nonDeletable: o.nonDeletable === true,
    createdAt: o.createdAt != null ? String(o.createdAt) : undefined,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
  };
}

export class ExpenseCategoryRequest {
  static async getOperationalGroupsMeta(): Promise<
    { success: true; rows: OperationalGroupMetaItem[] } | { success: false; error: string; rows: [] }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("expense-categories/meta/operational-groups"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res), rows: [] };
      }
      const json = (await res.json()) as unknown;
      const arr = Array.isArray(json) ? json : [];
      const rows = arr.map(normalizeMetaRow).filter((x): x is OperationalGroupMetaItem => x != null);
      return { success: true, rows };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al cargar grupos";
      return { success: false, error: err, rows: [] };
    }
  }

  static async list(
    companyId: string,
    limit = 500,
  ): Promise<{ success: true; rows: ExpenseCategoryListItem[] } | { success: false; error: string; rows: [] }> {
    const headers = await authHeaders();
    const q = new URLSearchParams({ companyId, limit: String(limit), offset: "0" });
    try {
      const res = await fetch(apiUrl(`expense-categories?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res), rows: [] };
      }
      const json = (await res.json()) as unknown;
      const data = json && typeof json === "object" && "data" in (json as object) ? (json as { data: unknown }).data : json;
      const arr = Array.isArray(data) ? data : [];
      const rows = arr.map(normalizeExpenseCategory).filter((x): x is ExpenseCategoryListItem => x != null);
      return { success: true, rows };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar categorías";
      return { success: false, error: err, rows: [] };
    }
  }

  static async create(body: {
    companyId: string;
    code?: string | null;
    name: string;
    operationalExpenseGroup: ExpenseCategoryOperationalGroupValue;
    pnlNature: ExpenseCategoryPnlNatureValue;
    description?: string | null;
    requiresApproval?: boolean;
    approvalThreshold?: number;
    defaultResultCenterId?: string | null;
    isActive?: boolean;
  }): Promise<{ success: true; category: ExpenseCategoryListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      companyId: body.companyId,
      name: body.name.trim(),
      operationalExpenseGroup: body.operationalExpenseGroup,
      pnlNature: body.pnlNature,
      requiresApproval: body.requiresApproval ?? false,
      approvalThreshold: body.approvalThreshold ?? 0,
      isActive: body.isActive !== false,
    };
    if (body.code != null && String(body.code).trim() !== "") {
      payload.code = String(body.code).trim();
    }
    if (body.description != null && String(body.description).trim() !== "") {
      payload.description = String(body.description).trim();
    }
    if (body.defaultResultCenterId != null && String(body.defaultResultCenterId).trim() !== "") {
      payload.defaultResultCenterId = String(body.defaultResultCenterId).trim();
    }
    try {
      const res = await fetch(apiUrl("expense-categories"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const raw = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        const data = raw as Record<string, unknown>;
        const msg =
          (typeof data.message === "string" && data.message) ||
          (Array.isArray(data.message) ? String(data.message[0]) : null) ||
          res.statusText;
        return { success: false, error: msg };
      }
      const c = normalizeExpenseCategory(raw);
      if (!c) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, category: c };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear categoría";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      code?: string;
      name: string;
      operationalExpenseGroup: ExpenseCategoryOperationalGroupValue;
      pnlNature: ExpenseCategoryPnlNatureValue;
      description: string | null;
      requiresApproval: boolean;
      approvalThreshold: number;
      defaultResultCenterId: string | null;
      isActive: boolean;
    },
  ): Promise<{ success: true; category: ExpenseCategoryListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      operationalExpenseGroup: body.operationalExpenseGroup,
      pnlNature: body.pnlNature,
      requiresApproval: body.requiresApproval,
      approvalThreshold: body.approvalThreshold,
      isActive: body.isActive,
    };
    if (body.code != null && String(body.code).trim() !== "") {
      payload.code = String(body.code).trim();
    }
    payload.description = body.description != null && body.description.trim() !== "" ? body.description.trim() : null;
    payload.defaultResultCenterId =
      body.defaultResultCenterId != null && body.defaultResultCenterId.trim() !== ""
        ? body.defaultResultCenterId.trim()
        : null;
    try {
      const res = await fetch(apiUrl(`expense-categories/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const raw = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        const data = raw as Record<string, unknown>;
        const msg =
          (typeof data.message === "string" && data.message) ||
          (Array.isArray(data.message) ? String(data.message[0]) : null) ||
          res.statusText;
        return { success: false, error: msg };
      }
      const c = normalizeExpenseCategory(raw);
      if (!c) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, category: c };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar categoría";
      return { success: false, error: err };
    }
  }

  static async updatePartial(
    id: string,
    body: { isActive?: boolean },
  ): Promise<{ success: true; category: ExpenseCategoryListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`expense-categories/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const raw = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const c = normalizeExpenseCategory(raw);
      if (!c) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, category: c };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar categoría";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`expense-categories/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const data = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: "No se pudo eliminar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar";
      return { success: false, error: err };
    }
  }
}
