import {
  DEFAULT_ESHOP_TEMPLATE_ID,
  ESHOP_TEMPLATE_IDS,
  ESHOP_THEME_PRESETS,
  type EShopResolvedTheme,
  type EShopTemplateId,
  type EShopThemeTokenOverrides,
  type EShopThemeTokens,
} from './eshop-theme-presets';

export type {
  EShopTemplateId,
  EShopThemeTokenKey,
  EShopThemeTokens,
  EShopThemeTokenOverrides,
  EShopResolvedTheme,
} from './eshop-theme-presets';

export { ESHOP_THEME_PRESETS, ESHOP_TEMPLATE_IDS, DEFAULT_ESHOP_TEMPLATE_ID } from './eshop-theme-presets';

export interface CompanyEShopThemeSettings {
  templateId: EShopTemplateId;
  tokenOverrides: EShopThemeTokenOverrides;
}

const OVERRIDE_KEYS: (keyof EShopThemeTokenOverrides)[] = [
  'primary',
  'secondary',
  'background',
  'foreground',
  'accent',
  'border',
  'chrome',
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

function isTemplateId(v: unknown): v is EShopTemplateId {
  return typeof v === 'string' && (ESHOP_TEMPLATE_IDS as string[]).includes(v);
}

function sanitizeHex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

export function buildDefaultCompanyEShopThemeSettings(): CompanyEShopThemeSettings {
  return {
    templateId: DEFAULT_ESHOP_TEMPLATE_ID,
    tokenOverrides: {},
  };
}

export function sanitizeCompanyEShopThemeSettings(
  settings: Record<string, unknown> | null | undefined,
): CompanyEShopThemeSettings {
  const defaults = buildDefaultCompanyEShopThemeSettings();
  if (!settings || typeof settings !== 'object') return defaults;

  const templateId = isTemplateId(settings.eShopTemplateId)
    ? settings.eShopTemplateId
    : defaults.templateId;

  const rawOverrides = settings.eShopThemeTokenOverrides;
  const tokenOverrides: EShopThemeTokenOverrides = {};
  if (rawOverrides && typeof rawOverrides === 'object') {
    for (const key of OVERRIDE_KEYS) {
      const hex = sanitizeHex((rawOverrides as Record<string, unknown>)[key]);
      if (hex) tokenOverrides[key] = hex;
    }
  }

  return { templateId, tokenOverrides };
}

export function resolveEShopTheme(
  settings: Record<string, unknown> | null | undefined,
): EShopResolvedTheme {
  const { templateId, tokenOverrides } = sanitizeCompanyEShopThemeSettings(settings);
  const preset = ESHOP_THEME_PRESETS[templateId].tokens;
  const merged: EShopThemeTokens = { ...preset };

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

export function listEShopThemePresetsForAdmin() {
  return ESHOP_TEMPLATE_IDS.map((id) => ({
    id,
    label: ESHOP_THEME_PRESETS[id].label,
    description: ESHOP_THEME_PRESETS[id].description,
    tokens: ESHOP_THEME_PRESETS[id].tokens,
  }));
}
