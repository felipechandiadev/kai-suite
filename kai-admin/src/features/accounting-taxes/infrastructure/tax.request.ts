import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { TaxListItem, TaxType } from "../types/tax.types";
import { TAX_TYPES } from "../types/tax.types";

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

function isTaxType(v: string): v is TaxType {
  return (TAX_TYPES as readonly string[]).includes(v);
}

function normalizeTax(row: unknown): TaxListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  const name = o.name != null ? String(o.name) : "";
  const codeNorm =
    o.code != null && String(o.code).trim() !== "" ? String(o.code).trim() : null;
  const typeRaw = o.taxType != null ? String(o.taxType) : "";
  if (!id || !companyId || !name || !isTaxType(typeRaw)) {
    return null;
  }
  const rateRaw = o.rate;
  const rate =
    typeof rateRaw === "number"
      ? rateRaw
      : rateRaw != null && String(rateRaw) !== ""
        ? Number(rateRaw)
        : 0;

  return {
    id,
    companyId,
    name,
    code: codeNorm,
    taxType: typeRaw,
    rate: Number.isFinite(rate) ? rate : 0,
    description: o.description != null && String(o.description).trim() ? String(o.description).trim() : null,
    isDefault: o.isDefault === true,
    isActive: o.isActive !== false,
    nonDeletable: o.nonDeletable === true,
    createdAt: o.createdAt != null ? String(o.createdAt) : undefined,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
  };
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

export class TaxRequest {
  static async findAll(
    includeInactive = true,
  ): Promise<{ success: true; taxes: TaxListItem[] } | { success: false; error: string; taxes: [] }> {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(apiUrl(`taxes${q}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res), taxes: [] };
      }
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) {
        return { success: true, taxes: [] };
      }
      const taxes = json.map(normalizeTax).filter((x): x is TaxListItem => x != null);
      return { success: true, taxes };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar impuestos";
      return { success: false, error: err, taxes: [] };
    }
  }

  static async findById(
    id: string,
  ): Promise<{ success: true; tax: TaxListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`taxes/${encodeURIComponent(id)}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const data = (await res.json()) as unknown;
      if (data && typeof data === "object" && "success" in (data as object) && (data as { success?: boolean }).success === false) {
        return { success: false, error: "Impuesto no encontrado" };
      }
      const t = normalizeTax(data);
      if (!t) {
        return { success: false, error: "Impuesto no encontrado" };
      }
      return { success: true, tax: t };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al cargar impuesto";
      return { success: false, error: err };
    }
  }

  static async create(body: {
    companyId: string;
    name: string;
    code?: string | null;
    taxType: TaxType;
    rate: number;
    description?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  }): Promise<{ success: true; tax: TaxListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      companyId: body.companyId,
      name: body.name.trim(),
      taxType: body.taxType,
      rate: body.rate,
      isDefault: body.isDefault ?? false,
      isActive: body.isActive !== false,
    };
    if (body.code != null && String(body.code).trim() !== "") {
      payload.code = String(body.code).trim();
    } else {
      payload.code = null;
    }
    if (body.description != null && body.description !== "") {
      payload.description = body.description;
    }
    try {
      const res = await fetch(apiUrl("taxes"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data.message === "string" && data.message) ||
          (Array.isArray(data.message) ? String(data.message[0]) : null) ||
          res.statusText;
        return { success: false, error: msg };
      }
      const inner = data.tax as unknown;
      const t = normalizeTax(inner ?? data);
      if (!t) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, tax: t };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear impuesto";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      name: string;
      code: string | null;
      taxType: TaxType;
      rate: number;
      description: string | null;
      isDefault: boolean;
      isActive: boolean;
    },
  ): Promise<{ success: true; tax: TaxListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      code: body.code != null && body.code.trim() !== "" ? body.code.trim() : null,
      taxType: body.taxType,
      rate: body.rate,
      description: body.description,
      isDefault: body.isDefault,
      isActive: body.isActive,
    };
    try {
      const res = await fetch(apiUrl(`taxes/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data.message === "string" && data.message) ||
          (Array.isArray(data.message) ? String(data.message[0]) : null) ||
          res.statusText;
        return { success: false, error: msg };
      }
      if (data.success === false) {
        return { success: false, error: typeof data.message === "string" ? data.message : "Error al actualizar" };
      }
      const inner = data.tax as unknown;
      const t = normalizeTax(inner ?? data);
      if (!t) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, tax: t };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar impuesto";
      return { success: false, error: err };
    }
  }

  static async updatePartial(
    id: string,
    body: { isActive?: boolean; isDefault?: boolean },
  ): Promise<{ success: true; tax: TaxListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`taxes/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      if (data.success === false) {
        return { success: false, error: typeof data.message === "string" ? data.message : "Error al actualizar" };
      }
      const inner = data.tax as unknown;
      const t = normalizeTax(inner ?? data);
      if (!t) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, tax: t };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar impuesto";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`taxes/${encodeURIComponent(id)}`), {
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
