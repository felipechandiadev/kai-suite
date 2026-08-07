import {
  readAcceptsPresaleTickets,
  readAllowsDeferredPayment,
  readPosKind,
  readKaiFoodEnabledSetting,
  resolveDeferredPaymentEnabled,
  resolveKaiFoodEnabled,
  sanitizePosSettingsPatch,
} from '@modules/points-of-sale/domain/pos-settings.types';

describe('pos-settings.types', () => {
  it('defaults kind to SALE', () => {
    expect(readPosKind(null)).toBe('SALE');
    expect(readPosKind({})).toBe('SALE');
  });

  it('reads PRESALE kind', () => {
    expect(readPosKind({ kind: 'PRESALE' })).toBe('PRESALE');
  });

  it('clears acceptsPresaleTickets on PRESALE', () => {
    const out = sanitizePosSettingsPatch(
      { acceptsPresaleTickets: true },
      { kind: 'PRESALE' },
    );
    expect(out.kind).toBe('PRESALE');
    expect(out.acceptsPresaleTickets).toBe(false);
  });

  it('accepts presale tickets only on SALE', () => {
    expect(readAcceptsPresaleTickets({ kind: 'SALE', acceptsPresaleTickets: true })).toBe(
      true,
    );
    expect(readAcceptsPresaleTickets({ kind: 'PRESALE', acceptsPresaleTickets: true })).toBe(
      false,
    );
  });

  it('clears allowsDeferredPayment on PRESALE', () => {
    const out = sanitizePosSettingsPatch(
      { allowsDeferredPayment: true },
      { kind: 'PRESALE' },
    );
    expect(out.allowsDeferredPayment).toBe(false);
  });

  it('resolveDeferredPaymentEnabled requires company and POS flags', () => {
    expect(
      resolveDeferredPaymentEnabled(true, {
        kind: 'SALE',
        allowsDeferredPayment: true,
      }),
    ).toBe(true);
    expect(
      resolveDeferredPaymentEnabled(false, {
        kind: 'SALE',
        allowsDeferredPayment: true,
      }),
    ).toBe(false);
    expect(
      resolveDeferredPaymentEnabled(true, {
        kind: 'SALE',
        allowsDeferredPayment: false,
      }),
    ).toBe(false);
    expect(readAllowsDeferredPayment({ kind: 'PRESALE', allowsDeferredPayment: true })).toBe(
      false,
    );
  });

  it('kaiFoodEnabled defaults to true', () => {
    expect(readKaiFoodEnabledSetting(null)).toBe(true);
    expect(readKaiFoodEnabledSetting({})).toBe(true);
    expect(readKaiFoodEnabledSetting({ kaiFoodEnabled: false })).toBe(false);
  });

  it('resolveKaiFoodEnabled requires company KaiFood and POS flag', () => {
    expect(resolveKaiFoodEnabled('kaifood', { kaiFoodEnabled: true })).toBe(true);
    expect(resolveKaiFoodEnabled('kaifood', {})).toBe(true);
    expect(resolveKaiFoodEnabled('kaifood', { kaiFoodEnabled: false })).toBe(false);
    expect(resolveKaiFoodEnabled('kaistore', { kaiFoodEnabled: true })).toBe(false);
  });

  it('sanitizePosSettingsPatch persists kaiFoodEnabled', () => {
    const out = sanitizePosSettingsPatch({}, { kaiFoodEnabled: false });
    expect(out.kaiFoodEnabled).toBe(false);
  });
});
