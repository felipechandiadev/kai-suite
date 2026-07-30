import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { AttributeListItem } from "../types/attribute.types";

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

function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter((s) => s.length > 0);
}

function normalizeAttribute(row: unknown): AttributeListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name) : "";
  if (!id || !name) {
    return null;
  }
  const desc =
    o.description != null && String(o.description).trim() ? String(o.description).trim() : null;
  return {
    id,
    name,
    description: desc,
    options: normalizeOptions(o.options),
    displayOrder: typeof o.displayOrder === "number" ? o.displayOrder : Number(o.displayOrder) || 0,
    isActive: o.isActive !== false,
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
    return m;
  }
  return res.statusText;
}

export class AttributeRequest {
  static async findAll(
    includeInactive = true,
  ): Promise<
    { success: true; attributes: AttributeListItem[] } | { success: false; error: string; attributes: [] }
  > {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(apiUrl(`attributes${q}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res), attributes: [] };
      }
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) {
        return { success: true, attributes: [] };
      }
      const attributes = json.map(normalizeAttribute).filter((x): x is AttributeListItem => x != null);
      return { success: true, attributes };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar atributos";
      return { success: false, error: err, attributes: [] };
    }
  }

  static async findById(
    id: string,
  ): Promise<{ success: true; attribute: AttributeListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`attributes/${encodeURIComponent(id)}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const data = (await res.json()) as unknown;
      const a = normalizeAttribute(data);
      if (!a) {
        return { success: false, error: "Atributo no encontrado" };
      }
      return { success: true, attribute: a };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al cargar atributo";
      return { success: false, error: err };
    }
  }

  static async create(body: {
    name: string;
    description?: string | null;
    options: string[];
  }): Promise<{ success: true; attribute: AttributeListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("attributes"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: body.name.trim(),
          description: body.description ?? null,
          options: body.options.map((o) => o.trim()).filter(Boolean),
        }),
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
      const inner = data.attribute as unknown;
      const a = normalizeAttribute(inner ?? data);
      if (!a) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, attribute: a };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear atributo";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      name: string;
      description: string | null;
      options: string[];
      isActive: boolean;
    },
  ): Promise<{ success: true; attribute: AttributeListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`attributes/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: body.name.trim(),
          description: body.description,
          options: body.options.map((o) => o.trim()).filter(Boolean),
          isActive: body.isActive,
        }),
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
      const inner = data.attribute as unknown;
      const a = normalizeAttribute(inner ?? data);
      if (!a) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, attribute: a };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar atributo";
      return { success: false, error: err };
    }
  }

  static async updatePartial(
    id: string,
    body: { isActive?: boolean },
  ): Promise<{ success: true; attribute: AttributeListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`attributes/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return { success: false, error: await errorMessage(res) };
      }
      const inner = data.attribute as unknown;
      const a = normalizeAttribute(inner ?? data);
      if (!a) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, attribute: a };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar atributo";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`attributes/${encodeURIComponent(id)}`), {
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
