import { createHmac, timingSafeEqual } from 'crypto';

/**
 * JWT HS256 mínimo (sin dependencias). Solo acepta alg=HS256 y exige `exp`.
 */
export type JwtClaims = Record<string, unknown> & {
  iat?: number;
  exp?: number;
};

export class JwtVerifyError extends Error {
  constructor(
    public readonly reason: 'malformed' | 'signature' | 'expired' | 'alg',
  ) {
    super(`JWT inválido: ${reason}`);
  }
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function looksLikeJwt(token: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

/** Convierte '15m', '24h', '7d', '30s' o segundos numéricos a segundos. */
export function parseDurationSeconds(value: string | undefined, fallback: number): number {
  const v = String(value ?? '').trim();
  if (!v) return fallback;
  const m = /^(\d+)\s*([smhd])?$/i.exec(v);
  if (!m) return fallback;
  const n = parseInt(m[1], 10);
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[
    (m[2] ?? 's').toLowerCase() as 's' | 'm' | 'h' | 'd'
  ];
  return n * mult;
}

export function signJwt(
  claims: JwtClaims,
  secret: string,
  expiresInSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  if (!secret) throw new Error('JWT secret vacío');
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ ...claims, iat: nowSeconds, exp: nowSeconds + expiresInSeconds }),
  );
  const data = `${header}.${payload}`;
  return `${data}.${sign(data, secret)}`;
}

export function verifyJwt<T extends JwtClaims = JwtClaims>(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): T {
  if (!secret) throw new Error('JWT secret vacío');
  if (!looksLikeJwt(token)) throw new JwtVerifyError('malformed');
  const [h, p, s] = token.split('.');
  let header: { alg?: string };
  let payload: T;
  try {
    header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    throw new JwtVerifyError('malformed');
  }
  if (header?.alg !== 'HS256') throw new JwtVerifyError('alg');
  const expected = Buffer.from(sign(`${h}.${p}`, secret));
  const given = Buffer.from(s);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new JwtVerifyError('signature');
  }
  if (!payload || typeof payload !== 'object' || typeof payload.exp !== 'number') {
    throw new JwtVerifyError('malformed');
  }
  if (payload.exp <= nowSeconds) throw new JwtVerifyError('expired');
  return payload;
}
