"use client";

import type { MultimediaAssetListItem, MultimediaEntityType } from "../types/multimedia.types";
import {
  multimediaApiUrl,
  multimediaAuthHeaders,
  multimediaErrorMessage,
  normalizeMultimediaAsset,
} from "../utils/multimedia-api.util";

export async function uploadMultimediaForEntityClient(input: {
  file: File;
  entityType: string;
  entityId: string;
  isPrimary: boolean;
  attributeId?: string | null;
  accessToken?: string | null;
  activeCompanyId?: string | null;
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
    const err = e instanceof Error ? e.message : "Error al subir archivo";
    return { success: false, error: err };
  }
}

/** Sube varios archivos en secuencia; el primero puede marcarse como principal. */
export async function uploadMultimediaFilesForEntity(input: {
  files: File[];
  entityType: MultimediaEntityType;
  entityId: string;
  accessToken?: string | null;
  activeCompanyId?: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const eid = input.entityId.trim();
  if (input.files.length === 0 || !eid) {
    return { success: true };
  }
  let markPrimary = true;
  for (const file of input.files) {
    const r = await uploadMultimediaForEntityClient({
      file,
      entityType: input.entityType,
      entityId: eid,
      isPrimary: markPrimary,
      accessToken: input.accessToken,
      activeCompanyId: input.activeCompanyId,
    });
    markPrimary = false;
    if (!r.success) {
      return r;
    }
  }
  return { success: true };
}
