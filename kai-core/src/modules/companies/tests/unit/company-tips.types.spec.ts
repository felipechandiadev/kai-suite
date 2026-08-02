import {
  buildDefaultCompanyTipSettings,
  sanitizeCompanyTipSettings,
} from '../../domain/company-tips.types';

describe('CompanyTipSettings helpers', () => {
  it('defaults: tips off, 10%, custom and cash allowed, NONE distribution', () => {
    expect(buildDefaultCompanyTipSettings()).toEqual({
      enabled: false,
      suggestPercent: 10,
      allowCustomAmount: true,
      allowCashTips: true,
      distributionMode: 'NONE',
    });
  });

  it('sanitizes and clamps percent', () => {
    const out = sanitizeCompanyTipSettings({
      enabled: 'true',
      suggestPercent: '15',
      allowCustomAmount: 0,
      allowCashTips: 1,
      distributionMode: 'pool',
    });
    expect(out).toEqual({
      enabled: true,
      suggestPercent: 15,
      allowCustomAmount: false,
      allowCashTips: true,
      distributionMode: 'POOL',
    });
  });

  it('clamps percent to 0..100', () => {
    expect(sanitizeCompanyTipSettings({ suggestPercent: -5 }).suggestPercent).toBe(
      0,
    );
    expect(
      sanitizeCompanyTipSettings({ suggestPercent: 250 }).suggestPercent,
    ).toBe(100);
  });

  it('falls back unknown distribution to NONE', () => {
    expect(
      sanitizeCompanyTipSettings({ distributionMode: 'WEIRD' }).distributionMode,
    ).toBe('NONE');
  });
});
