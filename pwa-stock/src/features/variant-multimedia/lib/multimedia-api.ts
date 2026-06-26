import type { MultimediaAssetListItem } from "../types/multimedia.types";
import { resolveMultimediaPublicUrl } from "./resolve-multimedia-public-url";

export function multimediaApiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    "";
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return base.replace(/\/$/, "");
}

export function multimediaApiUrl(path: string): string {
  return `${multimediaApiBase()}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export function normalizeMultimediaAsset(raw: unknown): MultimediaAssetListItem | null {
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
  };
}

export function multimediaAuthHeaders(input: {
  accessToken?: string | null;
  activeCompanyId?: string | null;
  json?: boolean;
}): Record<string, string> {
  const h: Record<string, string> = {};
  if (input.json !== false) {
    h["Content-Type"] = "application/json";
  }
  if (input.accessToken) {
    h.Authorization = `Bearer ${input.accessToken}`;
  }
  if (input.activeCompanyId) {
    h["X-Active-Company-Id"] = input.activeCompanyId;
  }
  return h;
}

export function multimediaErrorMessage(res: Response, data: Record<string, unknown>): string {
  const m = data.message;
  if (Array.isArray(m)) {
    return m.map(String).join("; ");
  }
  if (typeof m === "string" && m.trim()) {
    return m.trim();
  }
  return res.statusText || `Error ${res.status}`;
}
