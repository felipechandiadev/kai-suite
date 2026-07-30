/**
 * Contacto público de la empresa (eShop, documentos, footer).
 * Fuente de verdad en `companies.settings.publicContact`.
 */
export interface CompanyPublicContactSettings {
  email?: string;
  phone?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
}

export function buildDefaultCompanyPublicContact(): CompanyPublicContactSettings {
  return {};
}

export function sanitizeCompanyPublicContact(
  raw: unknown,
): CompanyPublicContactSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return buildDefaultCompanyPublicContact();
  }
  const o = raw as Record<string, unknown>;
  const trim = (v: unknown) =>
    typeof v === 'string' ? v.trim() || undefined : undefined;
  return {
    email: trim(o.email),
    phone: trim(o.phone),
    instagram: trim(o.instagram),
    tiktok: trim(o.tiktok),
    facebook: trim(o.facebook),
  };
}
