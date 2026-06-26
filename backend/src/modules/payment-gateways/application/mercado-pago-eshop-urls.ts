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

export function buildEshopCheckoutBackUrls():
  | { success: string; failure: string; pending: string }
  | undefined {
  const site = resolveEshopPublicSiteUrl();
  const backUrls = {
    success: `${site}/checkout/confirmacion?paid=1`,
    failure: `${site}/checkout?payment=failed`,
    pending: `${site}/checkout?payment=pending`,
  };
  if (!isMercadoPagoPublicBackUrl(backUrls.success)) {
    return undefined;
  }
  return backUrls;
}
