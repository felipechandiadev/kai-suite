/**
 * Configuración Mercado Pago en `companies.settings.mercadoPago`.
 */
export type MercadoPagoEnvironment = 'sandbox' | 'production';

export type EshopDefaultPaymentMode = 'online' | 'coordinate';

export interface CompanyMercadoPagoSettings {
  enabled: boolean;
  environment: MercadoPagoEnvironment;
  publicKey: string;
  accessToken: string;
  pointTerminalId: string | null;
  posPointEnabled: boolean;
  eshopOnlinePaymentEnabled: boolean;
  eshopDefaultPaymentMode: EshopDefaultPaymentMode;
}

export type CompanyMercadoPagoSettingsPublic = Omit<
  CompanyMercadoPagoSettings,
  'accessToken'
> & {
  accessTokenConfigured: boolean;
  accessTokenMasked: string | null;
};

export function buildDefaultCompanyMercadoPagoSettings(): CompanyMercadoPagoSettings {
  return {
    enabled: false,
    environment: 'sandbox',
    publicKey: '',
    accessToken: '',
    pointTerminalId: null,
    posPointEnabled: false,
    eshopOnlinePaymentEnabled: false,
    eshopDefaultPaymentMode: 'coordinate',
  };
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true';
}

export function maskAccessToken(token: string): string | null {
  const t = token.trim();
  if (!t) return null;
  if (t.length <= 8) return '****';
  return `${'*'.repeat(Math.min(12, t.length - 4))}${t.slice(-4)}`;
}

export function toPublicMercadoPagoSettings(
  settings: CompanyMercadoPagoSettings,
): CompanyMercadoPagoSettingsPublic {
  const token = settings.accessToken?.trim() ?? '';
  const { accessToken: _omit, ...rest } = settings;
  return {
    ...rest,
    accessTokenConfigured: token.length > 0,
    accessTokenMasked: maskAccessToken(token),
  };
}

export function sanitizeCompanyMercadoPagoSettings(
  raw: unknown,
  previous?: CompanyMercadoPagoSettings,
): CompanyMercadoPagoSettings {
  const r = (raw ?? {}) as Partial<CompanyMercadoPagoSettings> & {
    [k: string]: unknown;
  };
  const prev = previous ?? buildDefaultCompanyMercadoPagoSettings();
  const enabled = truthy(r.enabled);
  const environment: MercadoPagoEnvironment =
    r.environment === 'production' ? 'production' : 'sandbox';
  const publicKey = typeof r.publicKey === 'string' ? r.publicKey.trim() : prev.publicKey;

  let accessToken = prev.accessToken;
  if (typeof r.accessToken === 'string') {
    const incoming = r.accessToken.trim();
    if (incoming.length > 0 && !incoming.includes('*')) {
      accessToken = incoming;
    }
  }

  const pointTerminalId =
    r.pointTerminalId === null
      ? null
      : trimOrNull(r.pointTerminalId) ?? prev.pointTerminalId;

  const posPointEnabled = enabled && truthy(r.posPointEnabled);
  const eshopOnlinePaymentEnabled = truthy(r.eshopOnlinePaymentEnabled);
  const eshopDefaultPaymentMode: EshopDefaultPaymentMode =
    r.eshopDefaultPaymentMode === 'online' ? 'online' : 'coordinate';

  return {
    enabled,
    environment,
    publicKey,
    accessToken,
    pointTerminalId,
    posPointEnabled,
    eshopOnlinePaymentEnabled,
    eshopDefaultPaymentMode,
  };
}

export function readMercadoPagoSettingsFromCompanySettings(
  settings: Record<string, unknown> | null | undefined,
): CompanyMercadoPagoSettings {
  const raw = settings?.mercadoPago;
  if (!raw || typeof raw !== 'object') {
    return buildDefaultCompanyMercadoPagoSettings();
  }
  return sanitizeCompanyMercadoPagoSettings(raw);
}

/** Pago online operativo en checkout (credenciales + flag eShop). `enabled` es switch maestro para POS Point. */
export function isMercadoPagoEshopCheckoutOperational(
  settings: CompanyMercadoPagoSettings,
): boolean {
  return (
    settings.eshopOnlinePaymentEnabled &&
    Boolean(settings.publicKey?.trim()) &&
    Boolean(settings.accessToken?.trim())
  );
}
