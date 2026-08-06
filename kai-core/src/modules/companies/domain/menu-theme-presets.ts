export type MenuTemplateId = 'classic' | 'minimal' | 'bold' | 'warm' | 'coastal';

export type MenuThemeTokenKey =
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
  | 'mutedForeground'
  | 'card';

export type MenuThemeTokens = Record<MenuThemeTokenKey, string>;

export type MenuThemeTokenOverrides = Partial<
  Pick<
    MenuThemeTokens,
    'primary' | 'secondary' | 'background' | 'foreground' | 'accent' | 'border' | 'chrome' | 'card'
  >
>;

export type MenuResolvedTheme = {
  templateId: MenuTemplateId;
  tokens: MenuThemeTokens;
};

export type MenuThemePresetMeta = {
  id: MenuTemplateId;
  label: string;
  description: string;
  tokens: MenuThemeTokens;
};

export const MENU_THEME_PRESETS: Record<MenuTemplateId, MenuThemePresetMeta> = {
  classic: {
    id: 'classic',
    label: 'Clásico carta',
    description: 'Terracota y crema — tipografía de restaurante.',
    tokens: {
      primary: '#c2410c',
      secondary: '#ea580c',
      background: '#faf7f2',
      surface: '#faf7f2',
      card: '#ffffff',
      foreground: '#1c1917',
      border: '#e7e5e4',
      chrome: '#ffffff',
      chromeForeground: '#1c1917',
      active: '#c2410c',
      accent: '#c2410c',
      muted: '#78716c',
      mutedForeground: '#78716c',
    },
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Neutros limpios para carta contemporánea.',
    tokens: {
      primary: '#1f2937',
      secondary: '#4b5563',
      background: '#ffffff',
      surface: '#ffffff',
      card: '#ffffff',
      foreground: '#111827',
      border: '#e5e7eb',
      chrome: '#ffffff',
      chromeForeground: '#111827',
      active: '#374151',
      accent: '#374151',
      muted: '#9ca3af',
      mutedForeground: '#6b7280',
    },
  },
  bold: {
    id: 'bold',
    label: 'Bold',
    description: 'Alto contraste con acento ámbar.',
    tokens: {
      primary: '#0f172a',
      secondary: '#f59e0b',
      background: '#f8fafc',
      surface: '#f8fafc',
      card: '#ffffff',
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
    description: 'Tonos tierra para cocina y pastelería.',
    tokens: {
      primary: '#78350f',
      secondary: '#d97706',
      background: '#fffbeb',
      surface: '#fffbeb',
      card: '#ffffff',
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
  coastal: {
    id: 'coastal',
    label: 'Costero',
    description: 'Azules suaves para marisquería y barra.',
    tokens: {
      primary: '#0e7490',
      secondary: '#06b6d4',
      background: '#f0f9ff',
      surface: '#f0f9ff',
      card: '#ffffff',
      foreground: '#164e63',
      border: '#bae6fd',
      chrome: '#0e7490',
      chromeForeground: '#ffffff',
      active: '#0891b2',
      accent: '#0891b2',
      muted: '#64748b',
      mutedForeground: '#475569',
    },
  },
};

export const MENU_TEMPLATE_IDS = Object.keys(MENU_THEME_PRESETS) as MenuTemplateId[];

export const DEFAULT_MENU_TEMPLATE_ID: MenuTemplateId = 'classic';
