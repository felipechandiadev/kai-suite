const STORAGE_KEY = "kai-waiter-company";

export type AppCompanyConfig = {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
  rut?: string | null;
  savedAt: string;
};

export function readAppCompany(): AppCompanyConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppCompanyConfig>;
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

export function writeAppCompany(
  company: Omit<AppCompanyConfig, "savedAt">,
): AppCompanyConfig {
  const value: AppCompanyConfig = {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // localStorage deshabilitado.
    }
  }
  return value;
}

export function clearAppCompany(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
