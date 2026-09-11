const STORAGE_KEY = "kai-sami-company";

export type SamiCompanyConfig = {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
  rut?: string | null;
  savedAt: string;
};

export function readSamiCompany(): SamiCompanyConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SamiCompanyConfig>;
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

export function writeSamiCompany(
  company: Omit<SamiCompanyConfig, "savedAt">,
): SamiCompanyConfig {
  const value: SamiCompanyConfig = {
    ...company,
    nombreFantasia: company.nombreFantasia ?? null,
    savedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
  return value;
}
