import {
  buildDefaultCompanyQuotationSettings,
  sanitizeCompanyQuotationSettings,
} from '@modules/companies/domain/company-quotations.types';

describe('CompanyQuotationSettings helpers', () => {
  it('default leaves the module enabled with sensible windows', () => {
    expect(buildDefaultCompanyQuotationSettings()).toEqual({
      enabled: true,
      defaultValidityDays: 15,
      maxValidityDays: 60,
      allowCustomValidity: true,
      defaultTerms: null,
    });
  });

  it('sanitize coerces truthy variants and trims terms', () => {
    const out = sanitizeCompanyQuotationSettings({
      enabled: 'true',
      defaultValidityDays: '20',
      maxValidityDays: '90',
      allowCustomValidity: 1,
      defaultTerms: '  Términos  ',
    });
    expect(out.enabled).toBe(true);
    expect(out.defaultValidityDays).toBe(20);
    expect(out.maxValidityDays).toBe(90);
    expect(out.allowCustomValidity).toBe(true);
    expect(out.defaultTerms).toBe('Términos');
  });

  it('sanitize clamps below-min and above-max into the legal range', () => {
    const out = sanitizeCompanyQuotationSettings({
      defaultValidityDays: 0,
      maxValidityDays: 99999,
    });
    expect(out.defaultValidityDays).toBe(1);
    expect(out.maxValidityDays).toBe(1825);
  });

  it('sanitize forces max>=default when invariant is violated', () => {
    const out = sanitizeCompanyQuotationSettings({
      defaultValidityDays: 30,
      maxValidityDays: 10,
    });
    expect(out.defaultValidityDays).toBe(30);
    expect(out.maxValidityDays).toBe(30);
  });

  it('sanitize falls back to defaults for non-numeric inputs', () => {
    const out = sanitizeCompanyQuotationSettings({
      defaultValidityDays: 'abc',
      maxValidityDays: undefined,
    });
    expect(out.defaultValidityDays).toBe(15);
    expect(out.maxValidityDays).toBe(60);
  });
});
