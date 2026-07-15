import { resolveCashPaymentSource } from './reception-cash-payment-source.util';

describe('resolveCashPaymentSource', () => {
  it('prefers explicit hub even when request has cashSessionId', () => {
    expect(
      resolveCashPaymentSource(
        { cashHubId: 'hub-1', paymentMethod: 'CASH' },
        'session-1',
      ),
    ).toEqual({ kind: 'hub', cashHubId: 'hub-1' });
  });

  it('falls back to request session when line has neither hub nor session', () => {
    expect(resolveCashPaymentSource({ paymentMethod: 'CASH' }, 'session-1')).toEqual({
      kind: 'session',
      cashSessionId: 'session-1',
    });
  });

  it('uses line session over request session', () => {
    expect(
      resolveCashPaymentSource({ cashSessionId: 'line-session' }, 'request-session'),
    ).toEqual({ kind: 'session', cashSessionId: 'line-session' });
  });

  it('rejects hub and session together on the same line', () => {
    expect(
      resolveCashPaymentSource(
        { cashHubId: 'hub-1', cashSessionId: 'session-1' },
        null,
      ),
    ).toEqual({
      kind: 'invalid',
      error: 'efectivo no puede usar caja y centro de acopio a la vez.',
    });
  });

  it('returns missing when no hub and no session', () => {
    expect(resolveCashPaymentSource({ paymentMethod: 'CASH' }, null)).toEqual({
      kind: 'missing',
    });
  });
});
