export type CompanyMenuAboutSettings = {
  title: string;
  body: string;
};

export function buildDefaultCompanyMenuAboutSettings(): CompanyMenuAboutSettings {
  return {
    title: 'Nosotros',
    body:
      'Somos un restaurante de barrio con cocina casera, ingredientes frescos y un equipo apasionado por la buena mesa.',
  };
}

export function sanitizeCompanyMenuAboutSettings(
  raw: unknown,
): CompanyMenuAboutSettings {
  const defaults = buildDefaultCompanyMenuAboutSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const o = raw as Record<string, unknown>;
  const title =
    typeof o.title === 'string' && o.title.trim()
      ? o.title.trim().slice(0, 120)
      : defaults.title;
  const body =
    typeof o.body === 'string' && o.body.trim()
      ? o.body.trim().slice(0, 4000)
      : defaults.body;
  return { title, body };
}

export function resolveMenuAbout(
  settings: Record<string, unknown> | null | undefined,
): CompanyMenuAboutSettings {
  return sanitizeCompanyMenuAboutSettings(settings?.menuAbout);
}
