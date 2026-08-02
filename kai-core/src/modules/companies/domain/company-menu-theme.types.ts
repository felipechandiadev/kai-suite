export type CompanyMenuThemeSettings = {
  templateId: string;
  themeTokenOverrides: Record<string, string>;
};

export function buildDefaultCompanyMenuThemeSettings(): CompanyMenuThemeSettings {
  return {
    templateId: 'classic',
    themeTokenOverrides: {},
  };
}

export function sanitizeCompanyMenuThemeSettings(
  raw: unknown,
): CompanyMenuThemeSettings {
  const defaults = buildDefaultCompanyMenuThemeSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const o = raw as Record<string, unknown>;
  const templateId =
    typeof o.templateId === 'string' && o.templateId.trim()
      ? o.templateId.trim().slice(0, 40)
      : defaults.templateId;
  const overrides: Record<string, string> = {};
  if (o.themeTokenOverrides && typeof o.themeTokenOverrides === 'object') {
    for (const [k, v] of Object.entries(
      o.themeTokenOverrides as Record<string, unknown>,
    )) {
      if (typeof v === 'string' && v.trim()) {
        overrides[k] = v.trim();
      }
    }
  }
  return { templateId, themeTokenOverrides: overrides };
}

export function resolveMenuTheme(
  settings: Record<string, unknown> | null | undefined,
): CompanyMenuThemeSettings {
  return sanitizeCompanyMenuThemeSettings(settings?.menuTheme);
}
