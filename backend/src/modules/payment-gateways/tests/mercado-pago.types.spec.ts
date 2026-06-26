import {
  buildDefaultCompanyMercadoPagoSettings,
  isMercadoPagoEshopCheckoutOperational,
  maskAccessToken,
  sanitizeCompanyMercadoPagoSettings,
} from '@modules/companies/domain/company-mercado-pago.types';
import { mapMpOrderToIntentStatus, mapMpPaymentStatus } from '@modules/payment-gateways/domain/payment-gateway-intent.types';

describe('company-mercado-pago.types', () => {
  it('masks access token for display', () => {
    expect(maskAccessToken('TEST-1234567890-ABCD')).toMatch(/ABCD$/);
  });

  it('preserves token when incoming is masked', () => {
    const prev = buildDefaultCompanyMercadoPagoSettings();
    prev.accessToken = 'real-secret-token-1234';
    const next = sanitizeCompanyMercadoPagoSettings(
      { accessToken: '********1234', enabled: true },
      prev,
    );
    expect(next.accessToken).toBe('real-secret-token-1234');
  });

  it('updates token when new plain value provided', () => {
    const next = sanitizeCompanyMercadoPagoSettings({
      accessToken: 'new-token-value',
      enabled: true,
    });
    expect(next.accessToken).toBe('new-token-value');
  });

  it('allows eshop online flag when MP integration master switch is off', () => {
    const next = sanitizeCompanyMercadoPagoSettings({
      enabled: false,
      eshopOnlinePaymentEnabled: true,
    });
    expect(next.eshopOnlinePaymentEnabled).toBe(true);
    expect(next.enabled).toBe(false);
  });

  it('checkout operational with eshop flag and credentials (master switch optional)', () => {
    const ready = buildDefaultCompanyMercadoPagoSettings();
    ready.enabled = false;
    ready.eshopOnlinePaymentEnabled = true;
    ready.publicKey = 'TEST-pk';
    ready.accessToken = 'TEST-at';
    expect(isMercadoPagoEshopCheckoutOperational(ready)).toBe(true);

    ready.eshopOnlinePaymentEnabled = false;
    expect(isMercadoPagoEshopCheckoutOperational(ready)).toBe(false);

    ready.eshopOnlinePaymentEnabled = true;
    ready.accessToken = '';
    expect(isMercadoPagoEshopCheckoutOperational(ready)).toBe(false);
  });
});

describe('payment-gateway-intent.types', () => {
  it('maps mp approved status', () => {
    expect(mapMpPaymentStatus('approved')).toBe('APPROVED');
  });

  it('maps mp rejected status', () => {
    expect(mapMpPaymentStatus('rejected')).toBe('REJECTED');
  });

  it('maps API Orders processed as approved', () => {
    expect(mapMpOrderToIntentStatus({
      orderStatus: 'processed',
      orderStatusDetail: 'accredited',
    })).toBe('APPROVED');
  });

  it('maps API Orders processing as pending', () => {
    expect(mapMpOrderToIntentStatus({
      orderStatus: 'processing',
      paymentStatus: 'processing',
    })).toBe('PENDING');
  });
});
