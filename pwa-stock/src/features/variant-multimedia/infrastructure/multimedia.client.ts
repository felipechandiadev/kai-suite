"use client";

import type { MultimediaAssetListItem } from "../types/multimedia.types";
import {
  multimediaApiUrl,
  multimediaAuthHeaders,
  multimediaErrorMessage,
  normalizeMultimediaAsset,
} from "../lib/multimedia-api";

function attributeIdQueryParam(attributeId?: string | null): string {
  const aid = attributeId?.trim();
  return aid ? `?attributeId=${encodeURIComponent(aid)}` : "";
}

export async function listVariantMultimediaClient(input: {
  variantId: string;
  attributeId: string;
  accessToken?: string | null;
  activeCompanyId?: string | null;
}): Promise<
  { success: true; assets: MultimediaAssetListItem[] } | { success: false; error: string }
> {
  const eid = input.variantId.trim();
  const aid = input.attributeId.trim();
  if (!eid || !aid) {
    return { success: false, error: "Variante o atributo no válido" };
  }
  try {
    const headers = multimediaAuthHeaders({
      accessToken: input.accessToken,
      activeCompanyId: input.activeCompanyId,
    });
    const path = `multimedia/entities/product-variant/${encodeURIComponent(eid)}/assets${attributeIdQueryParam(aid)}`;
    const res = await fetch(multimediaApiUrl(path), {
      method: "GET",
      headers,
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { success: false, error: multimediaErrorMessage(res, data) };
    }
    const raw = data.data;
    const assets = Array.isArray(raw)
      ? raw.map(normalizeMultimediaAsset).filter((x): x is MultimediaAssetListItem => x != null)
      : [];
    return { success: true, assets };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al listar fotos",
    };
  }
}

export async function uploadVariantMultimediaClient(input: {
  file: File;
  variantId: string;
  attributeId: string;
  accessToken?: string | null;
  activeCompanyId?: string | null;
}): Promise<
  { success: true; asset: MultimediaAssetListItem } | { success: false; error: string }
> {
  const eid = input.variantId.trim();
  const aid = input.attributeId.trim();
  if (!eid || !aid) {
    return { success: false, error: "Variante o atributo no válido" };
  }
  if (!(input.file instanceof File) || input.file.size === 0) {
    return { success: false, error: "Archivo no válido" };
  }

  const form = new FormData();
  form.append("file", input.file);
  form.append("entityType", "product-variant");
  form.append("entityId", eid);
  form.append("usageType", "default");
  form.append("isPrimary", "false");
  form.append("attributeId", aid);

  try {
    const headers = multimediaAuthHeaders({
      accessToken: input.accessToken,
      activeCompanyId: input.activeCompanyId,
      json: false,
    });
    const res = await fetch(multimediaApiUrl("multimedia/assets"), {
      method: "POST",
      headers,
      body: form,
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { success: false, error: multimediaErrorMessage(res, data) };
    }
    const asset = normalizeMultimediaAsset(data.data);
    if (!asset) {
      return { success: false, error: "Respuesta inválida del servidor" };
    }
    return { success: true, asset };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al subir imagen",
    };
  }
}

export async function unlinkVariantMultimediaClient(input: {
  assetId: string;
  variantId: string;
  attributeId: string;
  accessToken?: string | null;
  activeCompanyId?: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const aid = input.assetId.trim();
  const eid = input.variantId.trim();
  const attrId = input.attributeId.trim();
  if (!aid || !eid || !attrId) {
    return { success: false, error: "Parámetros no válidos" };
  }
  const q = new URLSearchParams({
    entityType: "product-variant",
    entityId: eid,
    attributeId: attrId,
  });
  try {
    const headers = multimediaAuthHeaders({
      accessToken: input.accessToken,
      activeCompanyId: input.activeCompanyId,
      json: false,
    });
    const res = await fetch(
      multimediaApiUrl(`multimedia/assets/${encodeURIComponent(aid)}/links?${q.toString()}`),
      {
        method: "DELETE",
        headers,
        credentials: "include",
      },
    );
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { success: false, error: multimediaErrorMessage(res, data) };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al quitar imagen",
    };
  }
}
