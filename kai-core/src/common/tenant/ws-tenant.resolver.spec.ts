import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@modules/users/domain/user.entity';
import { AuthTokenService } from '@common/auth/auth-token.service';
import { signJwt } from '@common/auth/jwt-hs256';
import { readHandshakeCredential } from '@common/auth/ws-handshake-auth';
import { resolveWsTenant } from './ws-tenant.resolver';

const SECRET = 'test-access-secret';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_A = '22222222-2222-4222-8222-222222222222';
const COMPANY_B = '33333333-3333-4333-8333-333333333333';

function tokens(env: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    JWT_SECRET: SECRET,
    JWT_REFRESH_SECRET: 'r',
    NODE_ENV: 'test',
    ...env,
  };
  return new AuthTokenService({ get: (k: string) => values[k] } as any);
}

function deps(opts: {
  user?: any;
  membership?: unknown;
  env?: Record<string, string | undefined>;
}) {
  const logger = { warn: jest.fn() };
  const memberships = { getMembership: jest.fn().mockResolvedValue(opts.membership ?? null) };
  return {
    logger,
    memberships,
    d: {
      userRepository: { findOne: jest.fn().mockResolvedValue(opts.user ?? null) },
      companyRepository: { findOne: jest.fn().mockResolvedValue(null) },
      memberships,
      tokens: tokens(opts.env),
      logger,
      gateway: 'dining',
    } as any,
  };
}

const operator = { id: USER_ID, userName: 'cocina', rol: UserRole.OPERATOR, companyId: COMPANY_A };

describe('resolveWsTenant (handshake WS)', () => {
  it('acepta token ws firmado y usa cid si hay membership', async () => {
    const { d, logger, memberships } = deps({ user: operator, membership: { companyId: COMPANY_B } });
    const { token } = tokens().issueSocket(USER_ID, COMPANY_B);
    const r = await resolveWsTenant(d, { userId: token, activeCompanyIdHeader: undefined });
    expect(r.currentUser.id).toBe(USER_ID);
    expect(r.activeCompanyId).toBe(COMPANY_B);
    expect(memberships.getMembership).toHaveBeenCalledWith(USER_ID, COMPANY_B);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('JWT con cid sin membership cae a user.companyId', async () => {
    const { d } = deps({ user: operator, membership: null });
    const { token } = tokens().issueSocket(USER_ID, COMPANY_B);
    const r = await resolveWsTenant(d, { userId: token, activeCompanyIdHeader: undefined });
    expect(r.activeCompanyId).toBe(COMPANY_A);
  });

  it('acepta access token', async () => {
    const { d } = deps({ user: operator });
    const { accessToken } = tokens().issue(USER_ID, null);
    const r = await resolveWsTenant(d, { userId: accessToken, activeCompanyIdHeader: undefined });
    expect(r.activeCompanyId).toBe(COMPANY_A);
  });

  it('rechaza refresh token, firma inválida y token expirado', async () => {
    const { d } = deps({ user: operator });
    const { refreshToken } = tokens().issue(USER_ID, null);
    await expect(
      resolveWsTenant(d, { userId: refreshToken, activeCompanyIdHeader: undefined }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const forged = signJwt({ sub: USER_ID, cid: null, typ: 'ws' }, 'otro-secreto', 60);
    await expect(
      resolveWsTenant(d, { userId: forged, activeCompanyIdHeader: undefined }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const expired = signJwt({ sub: USER_ID, cid: null, typ: 'ws' }, SECRET, -10);
    await expect(
      resolveWsTenant(d, { userId: expired, activeCompanyIdHeader: undefined }),
    ).rejects.toThrow('Sesión expirada');
  });

  it('UUID legacy aceptado fuera de producción y registrado', async () => {
    const { d, logger } = deps({ user: operator });
    const r = await resolveWsTenant(d, { userId: USER_ID, activeCompanyIdHeader: undefined });
    expect(r.activeCompanyId).toBe(COMPANY_A);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Legacy UUID en handshake WS dining'));
  });

  it('UUID legacy rechazado en producción salvo AUTH_ALLOW_LEGACY_UUID_BEARER=true', async () => {
    const prod = deps({ user: operator, env: { NODE_ENV: 'production' } });
    await expect(
      resolveWsTenant(prod.d, { userId: USER_ID, activeCompanyIdHeader: undefined }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const allowed = deps({
      user: operator,
      env: { NODE_ENV: 'production', AUTH_ALLOW_LEGACY_UUID_BEARER: 'true' },
    });
    const r = await resolveWsTenant(allowed.d, { userId: USER_ID, activeCompanyIdHeader: undefined });
    expect(r.activeCompanyId).toBe(COMPANY_A);
    expect(allowed.logger.warn).toHaveBeenCalled();
  });

  it('rechaza credencial ausente o basura y usuario inexistente', async () => {
    const { d } = deps({ user: null });
    await expect(resolveWsTenant(d, { userId: undefined, activeCompanyIdHeader: undefined }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    await expect(resolveWsTenant(d, { userId: 'hola', activeCompanyIdHeader: undefined }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    await expect(resolveWsTenant(d, { userId: USER_ID, activeCompanyIdHeader: undefined }))
      .rejects.toThrow('Sesión inválida');
  });

  it('operador sin empresa → Forbidden', async () => {
    const { d } = deps({ user: { ...operator, companyId: null } });
    await expect(resolveWsTenant(d, { userId: USER_ID, activeCompanyIdHeader: undefined }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('readHandshakeCredential prioriza token sobre userId', () => {
    expect(readHandshakeCredential({ token: ' t ', userId: 'u' })).toBe('t');
    expect(readHandshakeCredential({ userId: 'u' })).toBe('u');
    expect(readHandshakeCredential({ token: '' })).toBeUndefined();
    expect(readHandshakeCredential(undefined)).toBeUndefined();
  });

  it('token ws no sirve como access token HTTP', () => {
    const t = tokens();
    const { token } = t.issueSocket(USER_ID, null);
    expect(() => t.verifyAccess(token)).toThrow();
    expect(t.verifySocket(token).sub).toBe(USER_ID);
  });
});
