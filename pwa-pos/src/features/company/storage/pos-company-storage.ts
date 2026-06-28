/**
 * Manejo centralizado del companyId activo del POS en localStorage.
 *
 * Estrategia: cada deployment de POS recuerda a qué empresa está conectado
 * para que, en logins sucesivos, no haya que volver a elegirla. Si nunca
 * fue configurado (o se borró), la LoginPage redirige al usuario a /setup.
 */

import {
  getMigratedLocalStorageItem,
  removeMigratedLocalStorageKeys,
  setMigratedLocalStorageItem,
} from "../../../../../shared/storage-key-migrate";

const STORAGE_KEY = "kai-pos-company";
const STORAGE_KEY_LEGACY = "flowstore-pos-company";

export type PosCompanyConfig = {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
  /** RUT fiscal si estaba disponible al guardar (opcional por compat. con datos antiguos). */
  rut?: string | null;
  /** Timestamp ISO de la última vez que se guardó. */
  savedAt: string;
};

/**
 * Lee la empresa configurada del localStorage del navegador.
 * Devuelve `null` si no hay configuración, si estamos en SSR, o si el JSON
 * está corrupto.
 */
export function readPosCompany(): PosCompanyConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getMigratedLocalStorageItem(STORAGE_KEY, STORAGE_KEY_LEGACY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PosCompanyConfig>;
    if (!parsed?.id || !parsed.razonSocial) return null;
    return {
      id: String(parsed.id),
      razonSocial: String(parsed.razonSocial),
      nombreFantasia:
        parsed.nombreFantasia != null && String(parsed.nombreFantasia).trim() !== ""
          ? String(parsed.nombreFantasia)
          : null,
      rut:
        parsed.rut != null && String(parsed.rut).trim() !== ""
          ? String(parsed.rut).trim()
          : null,
      savedAt:
        parsed.savedAt && typeof parsed.savedAt === "string"
          ? parsed.savedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Persiste la empresa elegida en el localStorage.
 */
export function writePosCompany(
  company: Omit<PosCompanyConfig, "savedAt">,
): PosCompanyConfig {
  const value: PosCompanyConfig = {
    id: company.id,
    razonSocial: company.razonSocial,
    nombreFantasia: company.nombreFantasia ?? null,
    rut:
      company.rut != null && String(company.rut).trim() !== ""
        ? String(company.rut).trim()
        : null,
    savedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      setMigratedLocalStorageItem(STORAGE_KEY, STORAGE_KEY_LEGACY, JSON.stringify(value));
    } catch {
      // localStorage podría estar deshabilitado (Safari modo privado, etc.)
      // No hay un fallback razonable; el usuario tendrá que reconfigurar.
    }
  }
  return value;
}

/**
 * Borra la configuración actual.
 */
export function clearPosCompany(): void {
  if (typeof window === "undefined") return;
  try {
    removeMigratedLocalStorageKeys(STORAGE_KEY, STORAGE_KEY_LEGACY);
  } catch {
    // ignore
  }
}

export const POS_COMPANY_STORAGE_KEY = STORAGE_KEY;
