import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { MultimediaAssetListItem } from "../types/multimedia.types";
import { resolveMultimediaPublicUrl } from "../utils/resolve-multimedia-public-url";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeadersJson(): Promise<HeadersInit> {
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

async function authHeadersMultipart(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = {};
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

function normalizeAsset(raw: unknown): MultimediaAssetListItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const publicUrlRaw = o.publicUrl != null ? String(o.publicUrl) : "";
  if (!id || !publicUrlRaw) {
    return null;
  }
  return {
    id,
    publicUrl: resolveMultimediaPublicUrl(publicUrlRaw),
    mimeType: o.mimeType != null ? String(o.mimeType) : "",
    kind: o.kind != null ? String(o.kind) : "",
    isPrimary: o.isPrimary === true,
    sortOrder: typeof o.sortOrder === "number" ? o.sortOrder : Number(o.sortOrder) || 0,
    linkId: o.linkId != null ? String(o.linkId) : undefined,
    thumbnailUrl:
      o.thumbnailUrl != null && String(o.thumbnailUrl).trim()
        ? resolveMultimediaPublicUrl(String(o.thumbnailUrl))
        : null,
  };
}

function attributeIdQueryParam(attributeId?: string | null): string {
  const trimmed = attributeId?.trim();
  return trimmed ? `?attributeId=${encodeURIComponent(trimmed)}` : "";
}

function attributeIdBodyField(attributeId?: string | null): { attributeId?: string } {
  const trimmed = attributeId?.trim();
  return trimmed ? { attributeId: trimmed } : {};
}

export class MultimediaRequest {
  static async listByEntity(
    entityType: string,
    entityId: string,
    attributeId?: string | null,
  ): Promise<{ success: true; assets: MultimediaAssetListItem[] } | { success: false; error: string }> {
    const et = entityType.trim();
    const eid = entityId.trim();
    if (!et || !eid) {
      return { success: false, error: "Entidad no válida" };
    }
    try {
      const headers = await authHeadersJson();
      const path = `multimedia/entities/${encodeURIComponent(et)}/${encodeURIComponent(eid)}/assets${attributeIdQueryParam(attributeId)}`;
      const res = await fetch(apiUrl(path), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      const raw = data.data;
      const assets = Array.isArray(raw)
        ? raw.map(normalizeAsset).filter((x): x is MultimediaAssetListItem => x != null)
        : [];
      return { success: true, assets };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar multimedia";
      return { success: false, error: err };
    }
  }

  static async uploadForEntity(input: {
    file: File;
    entityType: string;
    entityId: string;
    isPrimary: boolean;
    attributeId?: string | null;
  }): Promise<
    { success: true; asset: MultimediaAssetListItem } | { success: false; error: string }
  > {
    const et = input.entityType.trim();
    const eid = input.entityId.trim();
    if (!et || !eid) {
      return { success: false, error: "Entidad no válida" };
    }
    if (!(input.file instanceof File) || input.file.size === 0) {
      return { success: false, error: "Archivo no válido" };
    }
    const form = new FormData();
    form.append("file", input.file);
    form.append("entityType", et);
    form.append("entityId", eid);
    form.append("usageType", "default");
    form.append("isPrimary", input.isPrimary ? "true" : "false");
    const aid = input.attributeId?.trim();
    if (aid) {
      form.append("attributeId", aid);
    }
    try {
      const headers = await authHeadersMultipart();
      const res = await fetch(apiUrl("multimedia/assets"), {
        method: "POST",
        headers,
        body: form,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      const raw = data.data;
      const asset = normalizeAsset(raw);
      if (!asset) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, asset };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al subir archivo";
      return { success: false, error: err };
    }
  }

  static async unlinkFromEntity(input: {
    assetId: string;
    entityType: string;
    entityId: string;
    usageType?: string;
    attributeId?: string | null;
  }): Promise<{ success: true } | { success: false; error: string }> {
    const aid = input.assetId.trim();
    const et = input.entityType.trim();
    const eid = input.entityId.trim();
    if (!aid || !et || !eid) {
      return { success: false, error: "Parámetros no válidos" };
    }
    const q = new URLSearchParams();
    q.set("entityType", et);
    q.set("entityId", eid);
    if (input.usageType?.trim()) {
      q.set("usageType", input.usageType.trim());
    }
    const attrId = input.attributeId?.trim();
    if (attrId) {
      q.set("attributeId", attrId);
    }
    try {
      const headers = await authHeadersMultipart();
      const path = `multimedia/assets/${encodeURIComponent(aid)}/links?${q.toString()}`;
      const res = await fetch(apiUrl(path), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al quitar imagen";
      return { success: false, error: err };
    }
  }

  static async reorderForEntity(input: {
    entityType: string;
    entityId: string;
    assetIds: string[];
    attributeId?: string | null;
  }): Promise<{ success: true } | { success: false; error: string }> {
    const et = input.entityType.trim();
    const eid = input.entityId.trim();
    if (!et || !eid || input.assetIds.length === 0) {
      return { success: false, error: "Datos no válidos" };
    }
    try {
      const headers = await authHeadersJson();
      const res = await fetch(
        apiUrl(
          `multimedia/entities/${encodeURIComponent(et)}/${encodeURIComponent(eid)}/order`,
        ),
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            assetIds: input.assetIds,
            ...attributeIdBodyField(input.attributeId),
          }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al reordenar multimedia";
      return { success: false, error: err };
    }
  }

  static async setPrimaryForEntity(input: {
    entityType: string;
    entityId: string;
    assetId: string;
    attributeId?: string | null;
  }): Promise<{ success: true } | { success: false; error: string }> {
    const et = input.entityType.trim();
    const eid = input.entityId.trim();
    const aid = input.assetId.trim();
    if (!et || !eid || !aid) {
      return { success: false, error: "Datos no válidos" };
    }
    try {
      const headers = await authHeadersJson();
      const res = await fetch(
        apiUrl(
          `multimedia/entities/${encodeURIComponent(et)}/${encodeURIComponent(eid)}/primary`,
        ),
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            assetId: aid,
            ...attributeIdBodyField(input.attributeId),
          }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar imagen principal";
      return { success: false, error: err };
    }
  }
}
