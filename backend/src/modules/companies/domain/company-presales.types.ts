export interface CompanyPresaleSettings {
  enabled: boolean;
}

export function buildDefaultCompanyPresaleSettings(): CompanyPresaleSettings {
  return { enabled: false };
}

const truthy = (v: unknown): boolean =>
  v === true || v === 1 || v === '1' || v === 'true';

export function sanitizeCompanyPresaleSettings(
  raw: unknown,
): CompanyPresaleSettings {
  const r = (raw ?? {}) as Partial<CompanyPresaleSettings>;
  return { enabled: truthy(r.enabled) };
}
