import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { TenantGuard } from './tenant.guard';
import {
  ADMIN_ONLY_KEY,
  ALLOW_ADMIN_WITHOUT_COMPANY_KEY,
  SKIP_TENANT_KEY,
  SUPER_ADMIN_ONLY_KEY,
} from './tenant.decorators';
import { UserRole } from '@modules/users/domain/user.entity';
import { AuthTokenService } from '@common/auth/auth-token.service';
import { signJwt } from '@common/auth/jwt-hs256';

const TEST_SECRET = 'test-access-secret';
const TEST_REFRESH_SECRET = 'test-refresh-secret';

function buildTokens(env: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    JWT_SECRET: TEST_SECRET,
    JWT_REFRESH_SECRET: TEST_REFRESH_SECRET,
    NODE_ENV: 'test',
    ...env,
  };
  return new AuthTokenService({
    get: (k: string) => values[k],
  } as any);
}

type FakeRequest = {
  headers: Record<string, string | string[]>;
  currentUser?: unknown;
  activeCompanyId?: string | null;
};

function buildContext(req: FakeRequest) {
  const handler = () => undefined;
  const cls = function noop() {};
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
}

function buildReflector(meta: Record<string, boolean>) {
  return {
    getAllAndOverride: jest.fn((key: string) => meta[key] ?? false),
  } as unknown as Reflector;
}

function buildGuard(opts: {
  user: any;
  company?: { id: string; isActive: boolean } | null;
  fallback?: { id: string } | null;
  meta?: Record<string, boolean>;
  env?: Record<string, string | undefined>;
}) {
  const userRepo = {
    findOne: jest.fn().mockResolvedValue(opts.user),
  };
  const companyRepo = {
    findOne: jest.fn(async (params: any) => {
      if (params?.where?.id && opts.company) return opts.company;
      if (params?.where?.isActive === true && opts.fallback)
        return opts.fallback;
      return null;
    }),
  };
  const membershipsService = {
    ensureMembershipFromLegacy: jest.fn().mockResolvedValue(undefined),
    getMemberships: jest.fn().mockResolvedValue(
      opts.user?.companyId
        ? [
            {
              id: 'm1',
              companyId: opts.user.companyId,
              roles: [
                opts.user.rol === UserRole.ADMIN
                  ? 'ADMIN'
                  : opts.user.rol === UserRole.OPERATOR
                    ? 'POS_OPERATOR'
                    : opts.user.rol,
              ],
              isOwner: opts.user.rol === UserRole.ADMIN,
              isActive: true,
            },
          ]
        : [],
    ),
    getMembership: jest.fn().mockImplementation(async (_uid: string, cid: string) => {
      if (opts.user?.companyId === cid) {
        return {
          id: 'm1',
          companyId: cid,
          roles: [opts.user.rol === UserRole.OPERATOR ? 'POS_OPERATOR' : opts.user.rol],
          isOwner: opts.user.rol === UserRole.ADMIN,
          isActive: true,
        };
      }
      return null;
    }),
  };
  const guard = new TenantGuard(
    buildReflector(opts.meta ?? {}),
    userRepo as any,
    companyRepo as any,
    membershipsService as any,
    buildTokens(opts.env),
  );
  return { guard, userRepo, companyRepo, membershipsService };
}

const VALID_UUID = 'b3e0a8e0-8a9b-4f5a-9d4a-0a4c8d3b2f1e';
const OTHER_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('TenantGuard', () => {
  it('skips entirely when @SkipTenant is set', async () => {
    const { guard, userRepo } = buildGuard({
      user: null,
      meta: { [SKIP_TENANT_KEY]: true },
    });
    const ctx = buildContext({ headers: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(userRepo.findOne).not.toHaveBeenCalled();
  });

  it('rejects requests without a Bearer token', async () => {
    const { guard } = buildGuard({ user: null });
    const ctx = buildContext({ headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects requests when the user is no longer in the DB', async () => {
    const { guard } = buildGuard({ user: null });
    const ctx = buildContext({
      headers: { authorization: `Bearer ${VALID_UUID}` },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects ADMIN users without an assigned company', async () => {
    const { guard } = buildGuard({
      user: { id: VALID_UUID, userName: 'a', rol: UserRole.ADMIN, companyId: null },
    });
    const ctx = buildContext({
      headers: { authorization: `Bearer ${VALID_UUID}` },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('rejects ADMIN when X-Active-Company-Id is not in memberships', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'a',
        rol: UserRole.ADMIN,
        companyId: VALID_UUID,
      },
    });
    const ctx = buildContext({
      headers: {
        authorization: `Bearer ${VALID_UUID}`,
        'x-active-company-id': OTHER_UUID,
      },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows ADMIN with X-Active-Company-Id matching membership', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'a',
        rol: UserRole.ADMIN,
        companyId: VALID_UUID,
      },
    });
    const ctx = buildContext({
      headers: {
        authorization: `Bearer ${VALID_UUID}`,
        'x-active-company-id': VALID_UUID,
      },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((ctx.switchToHttp().getRequest() as FakeRequest).activeCompanyId).toBe(
      VALID_UUID,
    );
  });

  it('locks OPERATOR to their own company', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'op',
        rol: UserRole.OPERATOR,
        companyId: VALID_UUID,
      },
    });
    const ctx = buildContext({
      headers: { authorization: `Bearer ${VALID_UUID}` },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((ctx.switchToHttp().getRequest() as FakeRequest).activeCompanyId).toBe(
      VALID_UUID,
    );
  });

  it('allows SUPER_ADMIN to switch via X-Active-Company-Id header', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'sa',
        rol: UserRole.SUPER_ADMIN,
        companyId: null,
      },
      company: { id: OTHER_UUID, isActive: true },
    });
    const ctx = buildContext({
      headers: {
        authorization: `Bearer ${VALID_UUID}`,
        'x-active-company-id': OTHER_UUID,
      },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((ctx.switchToHttp().getRequest() as FakeRequest).activeCompanyId).toBe(
      OTHER_UUID,
    );
  });

  it('rejects SUPER_ADMIN when the requested company does not exist', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'sa',
        rol: UserRole.SUPER_ADMIN,
        companyId: null,
      },
      company: null,
    });
    const ctx = buildContext({
      headers: {
        authorization: `Bearer ${VALID_UUID}`,
        'x-active-company-id': OTHER_UUID,
      },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('rejects SUPER_ADMIN when the requested company is inactive', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'sa',
        rol: UserRole.SUPER_ADMIN,
        companyId: null,
      },
      company: { id: OTHER_UUID, isActive: false },
    });
    const ctx = buildContext({
      headers: {
        authorization: `Bearer ${VALID_UUID}`,
        'x-active-company-id': OTHER_UUID,
      },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('falls back to the first active company for SUPER_ADMIN when no header is sent', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'sa',
        rol: UserRole.SUPER_ADMIN,
        companyId: null,
      },
      fallback: { id: VALID_UUID },
    });
    const ctx = buildContext({
      headers: { authorization: `Bearer ${VALID_UUID}` },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((ctx.switchToHttp().getRequest() as FakeRequest).activeCompanyId).toBe(
      VALID_UUID,
    );
  });

  it('allows SUPER_ADMIN without active company when @AllowAdminWithoutCompany is set', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'sa',
        rol: UserRole.SUPER_ADMIN,
        companyId: null,
      },
      fallback: null,
      meta: { [ALLOW_ADMIN_WITHOUT_COMPANY_KEY]: true },
    });
    const ctx = buildContext({
      headers: { authorization: `Bearer ${VALID_UUID}` },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(
      (ctx.switchToHttp().getRequest() as FakeRequest).activeCompanyId,
    ).toBeNull();
  });

  it('forbids ADMIN on @SuperAdminOnly endpoints', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'a',
        rol: UserRole.ADMIN,
        companyId: VALID_UUID,
      },
      meta: { [SUPER_ADMIN_ONLY_KEY]: true },
    });
    const ctx = buildContext({
      headers: { authorization: `Bearer ${VALID_UUID}` },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('forbids OPERATOR on @AdminOnly endpoints', async () => {
    const { guard } = buildGuard({
      user: {
        id: VALID_UUID,
        userName: 'op',
        rol: UserRole.OPERATOR,
        companyId: VALID_UUID,
      },
      meta: { [ADMIN_ONLY_KEY]: true },
    });
    const ctx = buildContext({
      headers: { authorization: `Bearer ${VALID_UUID}` },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  describe('signed JWT bearer', () => {
    const tokens = buildTokens();
    const operator = {
      id: VALID_UUID,
      userName: 'mesero',
      rol: UserRole.OPERATOR,
      companyId: OTHER_UUID,
    };

    it('accepts a valid access token and uses its company claim', async () => {
      const { guard, userRepo } = buildGuard({ user: operator });
      const { accessToken } = tokens.issue(VALID_UUID, OTHER_UUID);
      const req: FakeRequest = {
        headers: { authorization: `Bearer ${accessToken}` },
      };
      await expect(guard.canActivate(buildContext(req))).resolves.toBe(true);
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: VALID_UUID } });
      expect(req.activeCompanyId).toBe(OTHER_UUID);
    });

    it('rejects a token with a bad signature', async () => {
      const { guard, userRepo } = buildGuard({ user: operator });
      const forged = signJwt(
        { sub: VALID_UUID, cid: OTHER_UUID, typ: 'access' },
        'wrong-secret',
        900,
      );
      const ctx = buildContext({ headers: { authorization: `Bearer ${forged}` } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects a tampered payload', async () => {
      const { guard } = buildGuard({ user: operator });
      const { accessToken } = tokens.issue(VALID_UUID, OTHER_UUID);
      const [h, , sig] = accessToken.split('.');
      const payload = Buffer.from(
        JSON.stringify({ sub: OTHER_UUID, cid: OTHER_UUID, typ: 'access', exp: 9999999999 }),
      ).toString('base64url');
      const ctx = buildContext({
        headers: { authorization: `Bearer ${h}.${payload}.${sig}` },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired token', async () => {
      const { guard } = buildGuard({ user: operator });
      const past = Math.floor(Date.now() / 1000) - 3600;
      const expired = signJwt(
        { sub: VALID_UUID, cid: OTHER_UUID, typ: 'access' },
        TEST_SECRET,
        60,
        past,
      );
      const ctx = buildContext({ headers: { authorization: `Bearer ${expired}` } });
      await expect(guard.canActivate(ctx)).rejects.toThrow('Sesión expirada');
    });

    it('rejects a refresh token used as access token', async () => {
      const { guard } = buildGuard({ user: operator });
      const { refreshToken } = tokens.issue(VALID_UUID, OTHER_UUID);
      const ctx = buildContext({ headers: { authorization: `Bearer ${refreshToken}` } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('forbids a token whose company claim is not in the user memberships', async () => {
      const { guard } = buildGuard({ user: operator });
      const foreign = 'c0ffee00-1111-4222-8333-444455556666';
      const { accessToken } = tokens.issue(VALID_UUID, foreign);
      const ctx = buildContext({ headers: { authorization: `Bearer ${accessToken}` } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('forbids a valid token pointing to another company via header', async () => {
      const { guard } = buildGuard({ user: operator });
      const foreign = 'c0ffee00-1111-4222-8333-444455556666';
      const { accessToken } = tokens.issue(VALID_UUID, OTHER_UUID);
      const ctx = buildContext({
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-active-company-id': foreign,
        },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('legacy UUID bearer', () => {
    const operator = {
      id: VALID_UUID,
      userName: 'mesero',
      rol: UserRole.OPERATOR,
      companyId: OTHER_UUID,
    };

    it('is rejected by default in production', async () => {
      const { guard, userRepo } = buildGuard({
        user: operator,
        env: { NODE_ENV: 'production' },
      });
      const ctx = buildContext({ headers: { authorization: `Bearer ${VALID_UUID}` } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('is accepted in production only with AUTH_ALLOW_LEGACY_UUID_BEARER=true', async () => {
      const { guard } = buildGuard({
        user: operator,
        env: { NODE_ENV: 'production', AUTH_ALLOW_LEGACY_UUID_BEARER: 'true' },
      });
      const ctx = buildContext({ headers: { authorization: `Bearer ${VALID_UUID}` } });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('can be disabled explicitly outside production', async () => {
      const { guard } = buildGuard({
        user: operator,
        env: { NODE_ENV: 'development', AUTH_ALLOW_LEGACY_UUID_BEARER: 'false' },
      });
      const ctx = buildContext({ headers: { authorization: `Bearer ${VALID_UUID}` } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });
});
