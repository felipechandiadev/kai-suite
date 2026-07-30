/**
 * Identidad de marca de la empresa (logo vía multimedia; texto en settings).
 * Fuente de verdad en `companies.settings.companyIdentity`.
 */
export interface CompanyIdentitySettings {
  tagline?: string;
  brandManifest?: string;
}

export function buildDefaultCompanyIdentity(): CompanyIdentitySettings {
  return {};
}

export function sanitizeCompanyIdentity(raw: unknown): CompanyIdentitySettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return buildDefaultCompanyIdentity();
  }
  const o = raw as Record<string, unknown>;
  const trim = (v: unknown) =>
    typeof v === 'string' ? v.trim() || undefined : undefined;
  return {
    tagline: trim(o.tagline),
    brandManifest: trim(o.brandManifest),
  };
}

/** Lee identidad desde settings; acepta legacy `companyTagline` en raíz. */
export function resolveCompanyIdentity(
  settings: Record<string, unknown> | null | undefined,
): CompanyIdentitySettings {
  const fromObject = sanitizeCompanyIdentity(settings?.companyIdentity);
  const legacyTagline =
    typeof settings?.companyTagline === 'string'
      ? settings.companyTagline.trim() || undefined
      : undefined;

  return {
    tagline: fromObject.tagline ?? legacyTagline,
    brandManifest: fromObject.brandManifest,
  };
}

export function readCompanyTagline(
  settings: Record<string, unknown> | null | undefined,
): string | null {
  const tagline = resolveCompanyIdentity(settings).tagline;
  return tagline ?? null;
}
