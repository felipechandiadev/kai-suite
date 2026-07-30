import { apiFailure } from "@/lib/auth/api-response";
import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type { AttributeListItem } from "../types/multimedia.types";

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
  return { id, name };
}

export class AttributesRequest {
  static async findAll(): Promise<
    { success: true; attributes: AttributeListItem[] } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("attributes?includeInactive=true"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        return apiFailure(res, data as Record<string, unknown>);
      }
      if (!Array.isArray(data)) {
        return { success: true, attributes: [] };
      }
      const attributes = data
        .map(normalizeAttribute)
        .filter((x): x is AttributeListItem => x != null);
      return { success: true, attributes };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al listar atributos",
      };
    }
  }
}
