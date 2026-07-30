import {
  buildDefaultCompanyPresaleSettings,
  sanitizeCompanyPresaleSettings,
} from '@modules/companies/domain/company-presales.types';

describe('company-presales.types', () => {
  it('defaults to disabled', () => {
    expect(buildDefaultCompanyPresaleSettings()).toEqual({ enabled: false });
  });

  it('sanitizes enabled flag', () => {
    expect(sanitizeCompanyPresaleSettings({ enabled: true }).enabled).toBe(true);
    expect(sanitizeCompanyPresaleSettings({ enabled: '1' }).enabled).toBe(true);
    expect(sanitizeCompanyPresaleSettings({ enabled: false }).enabled).toBe(
      false,
    );
  });
});
