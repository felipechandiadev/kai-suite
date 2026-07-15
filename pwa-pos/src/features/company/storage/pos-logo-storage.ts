/**
 * Cache local del logo del POS (data URL) para evitar el flash / skeleton en el top bar.
 * Quotas de localStorage: fallar en silencio si no hay espacio.
 */

import {
  getMigratedLocalStorageItem,
  removeMigratedLocalStorageKeys,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

const STORAGE_KEY = "kai-pos-logo-cache";
const STORAGE_KEY_LEGACY = "flowstore-pos-logo-cache";

export type PosLogoCache = {
  /** URL de origen (p.ej. `/logo.png` o URL absoluta de empresa). */
  src: string;
  /** Imagen embebida como data URL. */
  dataUrl: string;
  savedAt: string;
};

export function readPosLogoCache(expectedSrc?: string): PosLogoCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getMigratedLocalStorageItem(STORAGE_KEY, STORAGE_KEY_LEGACY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PosLogoCache>;
    if (!parsed?.src || !parsed?.dataUrl) return null;
    if (expectedSrc != null && parsed.src !== expectedSrc) return null;
    return {
      src: String(parsed.src),
      dataUrl: String(parsed.dataUrl),
      savedAt:
        parsed.savedAt && typeof parsed.savedAt === "string"
          ? parsed.savedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writePosLogoCache(src: string, dataUrl: string): void {
  if (typeof window === "undefined") return;
  if (!src.trim() || !dataUrl.startsWith("data:")) return;
  const value: PosLogoCache = {
    src: src.trim(),
    dataUrl,
    savedAt: new Date().toISOString(),
  };
  try {
    setMigratedLocalStorageItem(STORAGE_KEY, STORAGE_KEY_LEGACY, JSON.stringify(value));
  } catch {
    // QuotaExceeded o storage deshabilitado: ignorar.
  }
}

export function clearPosLogoCache(): void {
  if (typeof window === "undefined") return;
  try {
    removeMigratedLocalStorageKeys(STORAGE_KEY, STORAGE_KEY_LEGACY);
  } catch {
    // ignore
  }
}

/** Descarga la imagen y la convierte a data URL (para cache). */
export async function fetchLogoAsDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        resolve(typeof result === "string" ? result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export const POS_LOGO_CACHE_STORAGE_KEY = STORAGE_KEY;
