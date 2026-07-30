import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  AttributeValue,
  CareTemplate,
  GarmentAttribute,
  GarmentType,
} from "../types/laundry-catalog.types";

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

function nestErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const m = data.message;
  if (Array.isArray(m)) {
    return m.map(String).join("; ") || fallback;
  }
  if (typeof m === "string" && m.trim()) {
    return m.trim();
  }
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }
  return fallback;
}

function readBool(o: Record<string, unknown>, camel: string, snake: string, fallback = true): boolean {
  if (typeof o[camel] === "boolean") return o[camel] as boolean;
  if (typeof o[snake] === "boolean") return o[snake] as boolean;
  return fallback;
}

function readInt(o: Record<string, unknown>, camel: string, snake: string, fallback = 0): number {
  const raw = o[camel] ?? o[snake];
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function normalizeGarmentType(row: unknown): GarmentType | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const code = o.code != null ? String(o.code).trim() : "";
  const name = o.name != null ? String(o.name).trim() : "";
  if (!id || !code || !name) return null;
  return {
    id,
    code,
    name,
    active: readBool(o, "active", "active"),
    sortOrder: readInt(o, "sortOrder", "sort_order"),
  };
}

function normalizeAttributeValue(row: unknown, attributeId?: string): AttributeValue | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const label = o.label != null ? String(o.label).trim() : "";
  const attrId =
    attributeId ??
    (o.attributeId != null
      ? String(o.attributeId)
      : o.attribute_id != null
        ? String(o.attribute_id)
        : "");
  if (!id || !label || !attrId) return null;
  return {
    id,
    attributeId: attrId,
    label,
    active: readBool(o, "active", "active"),
    sortOrder: readInt(o, "sortOrder", "sort_order"),
  };
}

function normalizeGarmentAttribute(row: unknown): GarmentAttribute | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const code = o.code != null ? String(o.code).trim() : "";
  const name = o.name != null ? String(o.name).trim() : "";
  if (!id || !code || !name) return null;
  const valuesRaw = o.values;
  const values = Array.isArray(valuesRaw)
    ? valuesRaw
        .map((v) => normalizeAttributeValue(v, id))
        .filter((v): v is AttributeValue => v != null)
    : [];
  return {
    id,
    code,
    name,
    active: readBool(o, "active", "active"),
    sortOrder: readInt(o, "sortOrder", "sort_order"),
    values,
  };
}

function normalizeCareTemplate(row: unknown): CareTemplate | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const label = o.label != null ? String(o.label).trim() : "";
  const text = o.text != null ? String(o.text) : "";
  if (!id || !label) return null;
  return {
    id,
    label,
    text,
    active: readBool(o, "active", "active"),
    sortOrder: readInt(o, "sortOrder", "sort_order"),
  };
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

export class LaundryCatalogRequest {
  // --- Garment types ---

  static async listGarmentTypes(includeInactive = true): Promise<
    { success: true; items: GarmentType[] } | { success: false; error: string; items: [] }
  > {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(apiUrl(`laundry/catalog/types${q}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, items: [] };
      }
      const data = await parseJson(res);
      const raw = data.items;
      const items = Array.isArray(raw)
        ? raw.map(normalizeGarmentType).filter((x): x is GarmentType => x != null)
        : [];
      return { success: true, items };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar tipos de prenda";
      return { success: false, error: err, items: [] };
    }
  }

  static async createGarmentType(body: {
    code: string;
    name: string;
    active?: boolean;
    sortOrder?: number;
  }): Promise<{ success: true; item: GarmentType } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("laundry/catalog/types"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await parseJson(res);
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const item = normalizeGarmentType(data.item);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear tipo de prenda";
      return { success: false, error: err };
    }
  }

  static async updateGarmentType(
    id: string,
    body: { code?: string; name?: string; active?: boolean; sortOrder?: number },
  ): Promise<{ success: true; item: GarmentType } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`laundry/catalog/types/${encodeURIComponent(id)}`), {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await parseJson(res);
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const item = normalizeGarmentType(data.item);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar tipo de prenda";
      return { success: false, error: err };
    }
  }

  static async removeGarmentType(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`laundry/catalog/types/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await parseJson(res);
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar tipo de prenda";
      return { success: false, error: err };
    }
  }

  // --- Garment attributes ---

  static async listGarmentAttributes(includeInactive = true): Promise<
    { success: true; items: GarmentAttribute[] } | { success: false; error: string; items: [] }
  > {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(apiUrl(`laundry/catalog/attributes${q}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, items: [] };
      }
      const data = await parseJson(res);
      const raw = data.items;
      const items = Array.isArray(raw)
        ? raw.map(normalizeGarmentAttribute).filter((x): x is GarmentAttribute => x != null)
        : [];
      return { success: true, items };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar atributos";
      return { success: false, error: err, items: [] };
    }
  }

  static async createGarmentAttribute(body: {
    code: string;
    name: string;
    active?: boolean;
    sortOrder?: number;
  }): Promise<{ success: true; item: GarmentAttribute } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("laundry/catalog/attributes"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await parseJson(res);
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const item = normalizeGarmentAttribute(data.item);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear atributo";
      return { success: false, error: err };
    }
  }

  static async updateGarmentAttribute(
    id: string,
    body: { code?: string; name?: string; active?: boolean; sortOrder?: number },
  ): Promise<{ success: true; item: GarmentAttribute } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`laundry/catalog/attributes/${encodeURIComponent(id)}`), {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await parseJson(res);
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const item = normalizeGarmentAttribute(data.item);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar atributo";
      return { success: false, error: err };
    }
  }

  static async removeGarmentAttribute(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`laundry/catalog/attributes/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await parseJson(res);
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar atributo";
      return { success: false, error: err };
    }
  }

  // --- Attribute values ---

  static async createAttributeValue(
    attributeId: string,
    body: { label: string; active?: boolean; sortOrder?: number },
  ): Promise<{ success: true; item: AttributeValue } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(
        apiUrl(`laundry/catalog/attributes/${encodeURIComponent(attributeId)}/values`),
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          cache: "no-store",
        },
      );
      const data = await parseJson(res);
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const item = normalizeAttributeValue(data.item, attributeId);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear valor";
      return { success: false, error: err };
    }
  }

  static async updateAttributeValue(
    attributeId: string,
    valueId: string,
    body: { label?: string; active?: boolean; sortOrder?: number },
  ): Promise<{ success: true; item: AttributeValue } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(
        apiUrl(
          `laundry/catalog/attributes/${encodeURIComponent(attributeId)}/values/${encodeURIComponent(valueId)}`,
        ),
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(body),
          cache: "no-store",
        },
      );
      const data = await parseJson(res);
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const item = normalizeAttributeValue(data.item, attributeId);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar valor";
      return { success: false, error: err };
    }
  }

  static async removeAttributeValue(
    attributeId: string,
    valueId: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(
        apiUrl(
          `laundry/catalog/attributes/${encodeURIComponent(attributeId)}/values/${encodeURIComponent(valueId)}`,
        ),
        {
          method: "DELETE",
          headers,
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const data = await parseJson(res);
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar valor";
      return { success: false, error: err };
    }
  }

  // --- Care templates ---

  static async listCareTemplates(includeInactive = true): Promise<
    { success: true; items: CareTemplate[] } | { success: false; error: string; items: [] }
  > {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(apiUrl(`laundry/catalog/care-templates${q}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, items: [] };
      }
      const data = await parseJson(res);
      const raw = data.items;
      const items = Array.isArray(raw)
        ? raw.map(normalizeCareTemplate).filter((x): x is CareTemplate => x != null)
        : [];
      return { success: true, items };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar instrucciones";
      return { success: false, error: err, items: [] };
    }
  }

  static async createCareTemplate(body: {
    label: string;
    text: string;
    active?: boolean;
    sortOrder?: number;
  }): Promise<{ success: true; item: CareTemplate } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("laundry/catalog/care-templates"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await parseJson(res);
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const item = normalizeCareTemplate(data.item);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear instrucción";
      return { success: false, error: err };
    }
  }

  static async updateCareTemplate(
    id: string,
    body: { label?: string; text?: string; active?: boolean; sortOrder?: number },
  ): Promise<{ success: true; item: CareTemplate } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`laundry/catalog/care-templates/${encodeURIComponent(id)}`), {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await parseJson(res);
      if (!res.ok) {
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      const item = normalizeCareTemplate(data.item);
      if (!item) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, item };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar instrucción";
      return { success: false, error: err };
    }
  }

  static async removeCareTemplate(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`laundry/catalog/care-templates/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await parseJson(res);
        return { success: false, error: nestErrorMessage(data, res.statusText) };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar instrucción";
      return { success: false, error: err };
    }
  }
}
