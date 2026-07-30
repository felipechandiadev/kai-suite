"use client";

import type { MultimediaAssetListItem } from "../types/multimedia.types";
import {
  multimediaApiUrl,
  multimediaAuthHeaders,
  multimediaErrorMessage,
  normalizeMultimediaAsset,
} from "../lib/multimedia-api";

export type MultimediaEntityType = "product" | "product-variant";

function attributeIdQueryParam(attributeId?: string | null): string {
  const aid = attributeId?.trim();
  return aid ? `?attributeId=${encodeURIComponent(aid)}` : "";
}

function validateEntityInput(
  entityType: MultimediaEntityType,
  entityId: string,
  attributeId?: string | null,
): string | null {
  const eid = entityId.trim();
  if (!eid) {
    return "Entidad no válida";
  }
  if (entityType === "product-variant" && !attributeId?.trim()) {
    return "Variante o atributo no válido";
  }
  return null;
}

export async function listEntityMultimediaClient(input: {
  entityType: MultimediaEntityType;
  entityId: string;
  attributeId?: string | null;
  accessToken?: string | null;
  activeCompanyId?: string | null;
}): Promise<
  { success: true; assets: MultimediaAssetListItem[] } | { success: false; error: string }
> {
  const validationError = validateEntityInput(
    input.entityType,
    input.entityId,
    input.attributeId,
  );
  if (validationError) {
    return { success: false, error: validationError };
  }
  const eid = input.entityId.trim();
  try {
    const headers = multimediaAuthHeaders({
      accessToken: input.accessToken,
      activeCompanyId: input.activeCompanyId,
    });
    const path = `multimedia/entities/${encodeURIComponent(input.entityType)}/${encodeURIComponent(eid)}/assets${attributeIdQueryParam(input.attributeId)}`;
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

export async function uploadEntityMultimediaClient(input: {
  file: File;
  entityType: MultimediaEntityType;
  entityId: string;
  attributeId?: string | null;
  accessToken?: string | null;
  activeCompanyId?: string | null;
}): Promise<
  { success: true; asset: MultimediaAssetListItem } | { success: false; error: string }
> {
  const validationError = validateEntityInput(
    input.entityType,
    input.entityId,
    input.attributeId,
  );
  if (validationError) {
    return { success: false, error: validationError };
  }
  if (!(input.file instanceof File) || input.file.size === 0) {
    return { success: false, error: "Archivo no válido" };
  }

  const eid = input.entityId.trim();
  const form = new FormData();
  form.append("file", input.file);
  form.append("entityType", input.entityType);
  form.append("entityId", eid);
  form.append("usageType", "default");
  form.append("isPrimary", "false");
  const aid = input.attributeId?.trim();
  if (aid) {
    form.append("attributeId", aid);
  }

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

export async function unlinkEntityMultimediaClient(input: {
  assetId: string;
  entityType: MultimediaEntityType;
  entityId: string;
  attributeId?: string | null;
  accessToken?: string | null;
  activeCompanyId?: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const validationError = validateEntityInput(
    input.entityType,
    input.entityId,
    input.attributeId,
  );
  if (validationError) {
    return { success: false, error: validationError };
  }
  const aid = input.assetId.trim();
  const eid = input.entityId.trim();
  if (!aid) {
    return { success: false, error: "Parámetros no válidos" };
  }
  const q = new URLSearchParams({
    entityType: input.entityType,
    entityId: eid,
  });
  const attrId = input.attributeId?.trim();
  if (attrId) {
    q.set("attributeId", attrId);
  }
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
