import {
  JwtVerifyError,
  parseDurationSeconds,
  signJwt,
  verifyJwt,
} from './jwt-hs256';

describe('jwt-hs256', () => {
  it('round-trips claims', () => {
    const t = signJwt({ sub: 'u1' }, 's', 60);
    expect(verifyJwt(t, 's').sub).toBe('u1');
  });

  it('rejects wrong secret / expired / alg none', () => {
    const t = signJwt({ sub: 'u1' }, 's', 60);
    expect(() => verifyJwt(t, 'x')).toThrow(JwtVerifyError);
    const old = signJwt({ sub: 'u1' }, 's', 60, 1000);
    expect(() => verifyJwt(old, 's')).toThrow('expired');
    const [, p, sig] = t.split('.');
    const none = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    expect(() => verifyJwt(`${none}.${p}.${sig}`, 's')).toThrow('alg');
  });

  it('parses durations', () => {
    expect(parseDurationSeconds('15m', 1)).toBe(900);
    expect(parseDurationSeconds('7d', 1)).toBe(604800);
    expect(parseDurationSeconds('120', 1)).toBe(120);
    expect(parseDurationSeconds('bogus', 5)).toBe(5);
  });
});
