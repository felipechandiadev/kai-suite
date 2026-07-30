export type EShopTemplateId = 'classic' | 'minimal' | 'bold' | 'warm' | 'jewelry';

export type EShopThemeTokenKey =
  | 'primary'
  | 'secondary'
  | 'background'
  | 'foreground'
  | 'accent'
  | 'border'
  | 'chrome'
  | 'chromeForeground'
  | 'surface'
  | 'active'
  | 'muted'
  | 'mutedForeground';

export type EShopThemeTokens = Record<EShopThemeTokenKey, string>;

export type EShopThemeTokenOverrides = Partial<
  Pick<
    EShopThemeTokens,
    'primary' | 'secondary' | 'background' | 'foreground' | 'accent' | 'border' | 'chrome'
  >
>;

export type EShopResolvedTheme = {
  templateId: EShopTemplateId;
  tokens: EShopThemeTokens;
};

export type EShopThemePresetMeta = {
  id: EShopTemplateId;
  label: string;
  description: string;
  tokens: EShopThemeTokens;
};

export const ESHOP_THEME_PRESETS: Record<EShopTemplateId, EShopThemePresetMeta> = {
  classic: {
    id: 'classic',
    label: 'Clásico KaiStore',
    description: 'Azul marino y cyan — identidad actual del eShop.',
    tokens: {
      primary: '#002b59',
      secondary: '#04c9e6',
      background: '#ffffff',
      surface: '#ffffff',
      foreground: '#131615',
      border: '#c1c1c2',
      chrome: '#002b59',
      chromeForeground: '#ffffff',
      active: '#0a7cad',
      accent: '#0a7cad',
      muted: '#6b7280',
      mutedForeground: '#6b7280',
    },
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Neutros y mucho espacio en blanco.',
    tokens: {
      primary: '#1f2937',
      secondary: '#4b5563',
      background: '#ffffff',
      surface: '#ffffff',
      foreground: '#111827',
      border: '#e5e7eb',
      chrome: '#1f2937',
      chromeForeground: '#ffffff',
      active: '#374151',
      accent: '#374151',
      muted: '#9ca3af',
      mutedForeground: '#6b7280',
    },
  },
  bold: {
    id: 'bold',
    label: 'Bold',
    description: 'Alto contraste y acentos vibrantes para CTAs.',
    tokens: {
      primary: '#0f172a',
      secondary: '#f59e0b',
      background: '#f8fafc',
      surface: '#ffffff',
      foreground: '#0f172a',
      border: '#cbd5e1',
      chrome: '#0f172a',
      chromeForeground: '#ffffff',
      active: '#f59e0b',
      accent: '#f59e0b',
      muted: '#64748b',
      mutedForeground: '#475569',
    },
  },
  warm: {
    id: 'warm',
    label: 'Cálido',
    description: 'Tonos tierra para retail hogar y alimentos.',
    tokens: {
      primary: '#78350f',
      secondary: '#d97706',
      background: '#fffbeb',
      surface: '#ffffff',
      foreground: '#422006',
      border: '#fde68a',
      chrome: '#78350f',
      chromeForeground: '#ffffff',
      active: '#d97706',
      accent: '#b45309',
      muted: '#a8a29e',
      mutedForeground: '#78716c',
    },
  },
  jewelry: {
    id: 'jewelry',
    label: 'Joyería',
    description: 'Marfil cálido, carbón y oro champagne — estética Aurum / alta joyería.',
    tokens: {
      primary: '#2d2d2d',
      secondary: '#c5a059',
      background: '#fdfbf7',
      surface: '#fdfbf7',
      foreground: '#2d2d2d',
      border: '#e5e0d6',
      chrome: '#fdfbf7',
      chromeForeground: '#2d2d2d',
      active: '#a88547',
      accent: '#c5a059',
      muted: '#8b8476',
      mutedForeground: '#8b8476',
    },
  },
};

export const ESHOP_TEMPLATE_IDS = Object.keys(ESHOP_THEME_PRESETS) as EShopTemplateId[];

export const DEFAULT_ESHOP_TEMPLATE_ID: EShopTemplateId = 'classic';
