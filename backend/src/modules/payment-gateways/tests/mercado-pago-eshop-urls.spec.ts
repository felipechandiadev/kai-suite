import {
  buildEshopCheckoutBackUrls,
  resolveMpWebhookNotificationUrl,
} from '../application/mercado-pago-eshop-urls';

describe('mercado-pago-eshop-urls', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
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
    expect(buildEshopCheckoutBackUrls()).toEqual({
      success: 'https://tienda.test/checkout/confirmacion?paid=1',
      failure: 'https://tienda.test/checkout?payment=failed',
      pending: 'https://tienda.test/checkout?payment=pending',
    });
  });

  it('omits back URLs on localhost (MP rejects auto_return)', () => {
    process.env.ESHOP_PUBLIC_SITE_URL = 'http://localhost:5034';
    expect(buildEshopCheckoutBackUrls()).toBeUndefined();
  });
});
