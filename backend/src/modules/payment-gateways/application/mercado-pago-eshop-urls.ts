export function resolveMpWebhookNotificationUrl(): string | undefined {
  const base =
    process.env.MP_WEBHOOK_BASE_URL?.trim() ||
    `http://localhost:${process.env.PORT?.trim() || '5030'}`;
  const prefix = (process.env.API_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '');
  return `${base.replace(/\/$/, '')}/${prefix}/webhooks/mercado-pago`;
}

export function resolveEshopPublicSiteUrl(): string {
  return (
    process.env.ESHOP_PUBLIC_SITE_URL?.trim() || 'http://localhost:5034'
  ).replace(/\/$/, '');
}

export const MP_SANDBOX_PAYER_EMAIL_DEFAULT = 'test@testuser.com';

/**
 * En sandbox Checkout API Orders exige email `@testuser.com`.
 * En producción se usa el email real del comprador.
 */
export function resolveMpPayerEmail(
  environment: 'sandbox' | 'production',
  orderPayerEmail: string,
): string {
  if (environment === 'production') {
    return orderPayerEmail.trim();
  }
  const fromEnv = process.env.MP_SANDBOX_PAYER_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  const trimmed = orderPayerEmail.trim().toLowerCase();
  if (trimmed.endsWith('@testuser.com')) return trimmed;
  return MP_SANDBOX_PAYER_EMAIL_DEFAULT;
}

/** MP rechaza localhost en back_urls cuando auto_return está activo. */
export function isMercadoPagoPublicBackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      return false;
    }
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function buildEshopCheckoutBackUrls(orderId?: string):
  | { success: string; failure: string; pending: string }
  | undefined {
  const site = resolveEshopPublicSiteUrl();
  const orderQs = orderId?.trim()
    ? `orderId=${encodeURIComponent(orderId.trim())}`
    : '';
  const successQs = ['paid=1', orderQs].filter(Boolean).join('&');
  const backUrls = {
    success: `${site}/checkout/confirmacion?${successQs}`,
    failure: orderQs
      ? `${site}/checkout/failure?${orderQs}`
      : `${site}/checkout/failure`,
    pending: orderQs
      ? `${site}/checkout/pending?${orderQs}`
      : `${site}/checkout/pending`,
  };
  if (!isMercadoPagoPublicBackUrl(backUrls.success)) {
    return undefined;
  }
  return backUrls;
}
