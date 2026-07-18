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
});
