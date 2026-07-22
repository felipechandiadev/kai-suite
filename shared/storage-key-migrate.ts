/**
 * Dual-read localStorage durante migración flowstore → kai (F5).
 * Lee la clave nueva; si no existe, copia desde la legacy y persiste en la nueva.
 */

export function getMigratedLocalStorageItem(newKey: string, legacyKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const current = window.localStorage.getItem(newKey);
    if (current !== null) return current;
    const legacy = window.localStorage.getItem(legacyKey);
    if (legacy !== null) {
      window.localStorage.setItem(newKey, legacy);
      return legacy;
    }
  } catch {
    /* quota or private mode */
  }
  return null;
}

export function setMigratedLocalStorageItem(
  newKey: string,
  legacyKey: string,
  value: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(newKey, value);
    // Solo borrar legacy si es otra clave (si new === legacy, removeItem borraba lo recién guardado).
    if (legacyKey && legacyKey !== newKey) {
      window.localStorage.removeItem(legacyKey);
    }
  } catch {
    /* ignore */
  }
}

export function removeMigratedLocalStorageKeys(newKey: string, legacyKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(newKey);
    window.localStorage.removeItem(legacyKey);
  } catch {
    /* ignore */
  }
}

/** Reemplaza prefijo en keys dinámicas (p. ej. cart por POS). */
export function migrateKeyPrefix(key: string, legacyPrefix: string, newPrefix: string): string {
  if (key.startsWith(newPrefix)) return key;
  if (key.startsWith(legacyPrefix)) return newPrefix + key.slice(legacyPrefix.length);
  return key;
}

export function getMigratedPrefixedItem(fullNewKey: string, fullLegacyKey: string): string | null {
  return getMigratedLocalStorageItem(fullNewKey, fullLegacyKey);
}

export function getMigratedSessionStorageItem(newKey: string, legacyKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const current = sessionStorage.getItem(newKey);
    if (current !== null) return current;
    const legacy = sessionStorage.getItem(legacyKey);
    if (legacy !== null) {
      sessionStorage.setItem(newKey, legacy);
      return legacy;
    }
  } catch {
    /* quota or private mode */
  }
  return null;
}

export function setMigratedSessionStorageItem(
  newKey: string,
  legacyKey: string,
  value: string,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(newKey, value);
    sessionStorage.removeItem(legacyKey);
  } catch {
    /* ignore */
  }
}

export function removeMigratedSessionStorageKeys(newKey: string, legacyKey: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(newKey);
    sessionStorage.removeItem(legacyKey);
  } catch {
    /* ignore */
  }
}
