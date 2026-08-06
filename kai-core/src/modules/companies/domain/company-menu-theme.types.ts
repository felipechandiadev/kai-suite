import {
  DEFAULT_MENU_TEMPLATE_ID,
  MENU_TEMPLATE_IDS,
  MENU_THEME_PRESETS,
  type MenuResolvedTheme,
  type MenuTemplateId,
  type MenuThemeTokenOverrides,
  type MenuThemeTokens,
} from './menu-theme-presets';

export type {
  MenuTemplateId,
  MenuThemeTokenKey,
  MenuThemeTokens,
  MenuThemeTokenOverrides,
  MenuResolvedTheme,
} from './menu-theme-presets';

export {
  MENU_THEME_PRESETS,
  MENU_TEMPLATE_IDS,
  DEFAULT_MENU_TEMPLATE_ID,
} from './menu-theme-presets';

export type CompanyMenuThemeSettings = {
  templateId: MenuTemplateId;
  tokenOverrides: MenuThemeTokenOverrides;
};

const OVERRIDE_KEYS: (keyof MenuThemeTokenOverrides)[] = [
  'primary',
  'secondary',
  'background',
  'foreground',
  'accent',
  'border',
  'chrome',
  'card',
];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function isLightHexColor(hex: string): boolean {
  const normalized = hex.trim().toLowerCase();
  if (!HEX_COLOR.test(normalized)) return false;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

function isTemplateId(v: unknown): v is MenuTemplateId {
  return typeof v === 'string' && (MENU_TEMPLATE_IDS as string[]).includes(v);
}

function sanitizeHex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

export function buildDefaultCompanyMenuThemeSettings(): CompanyMenuThemeSettings {
  return {
    templateId: DEFAULT_MENU_TEMPLATE_ID,
    tokenOverrides: {},
  };
}

export function sanitizeCompanyMenuThemeSettings(
  raw: unknown,
): CompanyMenuThemeSettings {
  const defaults = buildDefaultCompanyMenuThemeSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const o = raw as Record<string, unknown>;
  const templateId = isTemplateId(o.templateId)
    ? o.templateId
    : defaults.templateId;

  const tokenOverrides: MenuThemeTokenOverrides = {};
  const rawOverrides =
    (o.tokenOverrides && typeof o.tokenOverrides === 'object'
      ? o.tokenOverrides
      : null) ??
    (o.themeTokenOverrides && typeof o.themeTokenOverrides === 'object'
      ? o.themeTokenOverrides
      : null);
  if (rawOverrides) {
    for (const key of OVERRIDE_KEYS) {
      const hex = sanitizeHex((rawOverrides as Record<string, unknown>)[key]);
      if (hex) tokenOverrides[key] = hex;
    }
  }

  return { templateId, tokenOverrides };
}

export function resolveMenuTheme(
  settings: Record<string, unknown> | null | undefined,
): MenuResolvedTheme {
  const { templateId, tokenOverrides } = sanitizeCompanyMenuThemeSettings(
    settings?.menuTheme,
  );
  const preset = MENU_THEME_PRESETS[templateId].tokens;
  const merged: MenuThemeTokens = { ...preset };

  for (const key of OVERRIDE_KEYS) {
    const override = tokenOverrides[key];
    if (override) merged[key] = override;
  }

  if (tokenOverrides.background) {
    merged.surface = tokenOverrides.background;
  }
  if (tokenOverrides.accent) {
    merged.active = tokenOverrides.accent;
  }
  if (tokenOverrides.chrome) {
    merged.chromeForeground = isLightHexColor(merged.chrome)
      ? merged.foreground
      : '#ffffff';
  }

  return { templateId, tokens: merged };
}

export function listMenuThemePresetsForAdmin() {
  return MENU_TEMPLATE_IDS.map((id) => ({
    id,
    label: MENU_THEME_PRESETS[id].label,
    description: MENU_THEME_PRESETS[id].description,
    tokens: MENU_THEME_PRESETS[id].tokens,
  }));
}
