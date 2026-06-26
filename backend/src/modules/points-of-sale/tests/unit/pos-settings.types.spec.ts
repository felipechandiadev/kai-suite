import {
  readAcceptsPresaleTickets,
  readPosKind,
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
});
