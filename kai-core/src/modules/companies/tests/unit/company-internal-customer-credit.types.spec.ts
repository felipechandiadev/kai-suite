import {
  buildDefaultInternalCustomerCreditSettings,
  sanitizeInternalCustomerCreditSettings,
} from '@modules/companies/domain/company-internal-customer-credit.types';

describe('CompanyInternalCustomerCreditSettings helpers', () => {
  it('default has internal credit enabled', () => {
    expect(buildDefaultInternalCustomerCreditSettings()).toEqual({
      enabled: true,
    });
  });

  it('sanitize coerces truthy variants', () => {
    expect(
      sanitizeInternalCustomerCreditSettings({ enabled: 'true' }),
    ).toEqual({ enabled: true });
    expect(sanitizeInternalCustomerCreditSettings({ enabled: 0 })).toEqual({
      enabled: false,
    });
  });
});
