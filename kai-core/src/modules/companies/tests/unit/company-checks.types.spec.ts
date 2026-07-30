import {
  buildDefaultCompanyCheckSettings,
  sanitizeCompanyCheckSettings,
} from '@modules/companies/domain/company-checks.types';

describe('CompanyCheckSettings helpers', () => {
  it('default is all-disabled', () => {
    expect(buildDefaultCompanyCheckSettings()).toEqual({
      enabled: false,
      receiveChecks: false,
      issueChecks: false,
      allowPostdatedReceived: false,
      allowPostdatedIssued: false,
      defaultDepositBankAccountKey: null,
      defaultIssueBankAccountKey: null,
    });
  });

  it('sanitize forces dependent flags to false when enabled=false', () => {
    const out = sanitizeCompanyCheckSettings({
      enabled: false,
      receiveChecks: true,
      issueChecks: true,
      allowPostdatedReceived: true,
      allowPostdatedIssued: true,
    });
    expect(out.enabled).toBe(false);
    expect(out.receiveChecks).toBe(false);
    expect(out.issueChecks).toBe(false);
    expect(out.allowPostdatedReceived).toBe(false);
    expect(out.allowPostdatedIssued).toBe(false);
  });

  it('sanitize coerces truthy variants', () => {
    const out = sanitizeCompanyCheckSettings({
      enabled: 'true',
      receiveChecks: 1,
      issueChecks: true,
      allowPostdatedReceived: '1',
      allowPostdatedIssued: false,
      defaultDepositBankAccountKey: '  acct-1  ',
      defaultIssueBankAccountKey: '',
    });
    expect(out).toEqual({
      enabled: true,
      receiveChecks: true,
      issueChecks: true,
      allowPostdatedReceived: true,
      allowPostdatedIssued: false,
      defaultDepositBankAccountKey: 'acct-1',
      defaultIssueBankAccountKey: null,
    });
  });

  it('maps legacy allowPostdated to both when new keys absent', () => {
    const out = sanitizeCompanyCheckSettings({
      enabled: true,
      receiveChecks: true,
      issueChecks: true,
      allowPostdated: true,
    });
    expect(out.allowPostdatedReceived).toBe(true);
    expect(out.allowPostdatedIssued).toBe(true);
  });

  it('legacy allowPostdated only applies to active receive/issue', () => {
    const out = sanitizeCompanyCheckSettings({
      enabled: true,
      receiveChecks: true,
      issueChecks: false,
      allowPostdated: true,
    });
    expect(out.allowPostdatedReceived).toBe(true);
    expect(out.allowPostdatedIssued).toBe(false);
  });

  it('explicit new keys override legacy allowPostdated', () => {
    const out = sanitizeCompanyCheckSettings({
      enabled: true,
      receiveChecks: true,
      issueChecks: true,
      allowPostdated: true,
      allowPostdatedReceived: false,
      allowPostdatedIssued: true,
    });
    expect(out.allowPostdatedReceived).toBe(false);
    expect(out.allowPostdatedIssued).toBe(true);
  });
});
