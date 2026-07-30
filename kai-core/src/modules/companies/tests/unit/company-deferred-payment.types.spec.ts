import {
  buildDefaultCompanyDeferredPaymentSettings,
  sanitizeCompanyDeferredPaymentSettings,
} from '@modules/companies/domain/company-deferred-payment.types';

describe('company-deferred-payment.types', () => {
  it('defaults to disabled', () => {
    expect(buildDefaultCompanyDeferredPaymentSettings()).toEqual({
      enabled: false,
    });
  });

  it('sanitize coerces enabled', () => {
    expect(sanitizeCompanyDeferredPaymentSettings({ enabled: true })).toEqual({
      enabled: true,
    });
    expect(sanitizeCompanyDeferredPaymentSettings({ enabled: '1' })).toEqual({
      enabled: true,
    });
    expect(sanitizeCompanyDeferredPaymentSettings({ enabled: false })).toEqual({
      enabled: false,
    });
    expect(sanitizeCompanyDeferredPaymentSettings(null)).toEqual({
      enabled: false,
    });
  });
});
