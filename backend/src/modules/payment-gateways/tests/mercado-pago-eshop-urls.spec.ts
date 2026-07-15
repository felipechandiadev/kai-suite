import {
  buildEshopCheckoutBackUrls,
  resolveMpPayerEmail,
  resolveMpWebhookNotificationUrl,
} from '../application/mercado-pago-eshop-urls';

describe('mercado-pago-eshop-urls', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.MP_SANDBOX_PAYER_EMAIL;
  });

  afterAll(() => {
    process.env = env;
  });

  it('builds webhook notification URL from MP_WEBHOOK_BASE_URL', () => {
    process.env.MP_WEBHOOK_BASE_URL = 'https://api.example.com';
    process.env.API_PREFIX = 'api';
    expect(resolveMpWebhookNotificationUrl()).toBe(
      'https://api.example.com/api/webhooks/mercado-pago',
    );
  });

  it('builds checkout back URLs from ESHOP_PUBLIC_SITE_URL', () => {
    process.env.ESHOP_PUBLIC_SITE_URL = 'https://tienda.test';
    expect(buildEshopCheckoutBackUrls('ord-1')).toEqual({
      success: 'https://tienda.test/checkout/confirmacion?paid=1&orderId=ord-1',
      failure: 'https://tienda.test/checkout/failure?orderId=ord-1',
      pending: 'https://tienda.test/checkout/pending?orderId=ord-1',
    });
  });

  it('omits back URLs on localhost (MP rejects auto_return)', () => {
    process.env.ESHOP_PUBLIC_SITE_URL = 'http://localhost:5034';
    expect(buildEshopCheckoutBackUrls('ord-1')).toBeUndefined();
  });

  it('forces @testuser.com payer email in sandbox', () => {
    expect(resolveMpPayerEmail('sandbox', 'cliente@gmail.com')).toBe(
      'test@testuser.com',
    );
  });

  it('keeps real email in production', () => {
    expect(resolveMpPayerEmail('production', 'cliente@gmail.com')).toBe(
      'cliente@gmail.com',
    );
  });
});
