import { ForbiddenException } from '@nestjs/common';
import { UsersService } from '@modules/users/application/users.service';
import { User, UserRole } from '@modules/users/domain/user.entity';
import type { CurrentUserPayload } from '@common/tenant';

type UserMock = Pick<User, 'id' | 'rol' | 'companyId' | 'nonDeletable'> & {
  deletedAt?: Date | null;
};

function makeUser(overrides: Partial<UserMock>): UserMock {
  return {
    id: 'user-1',
    rol: UserRole.OPERATOR,
    companyId: 'company-a',
    nonDeletable: false,
    ...overrides,
  };
}

function makeCurrent(
  overrides: Partial<CurrentUserPayload> = {},
): CurrentUserPayload {
  return {
    id: 'me',
    userName: 'me',
    rol: UserRole.SUPER_ADMIN,
    companyId: null,
    ...overrides,
  };
}

function buildService(target: UserMock | null) {
  const userRepository = {
    findOne: jest.fn().mockResolvedValue(target),
    softDelete: jest.fn().mockResolvedValue({ affected: target ? 1 : 0 }),
  };
  const personRepository = { findOne: jest.fn(), save: jest.fn() };
  const employeeRepository = { findOne: jest.fn(), save: jest.fn() };
  const personsService = {};
  const membershipsService = {
    getMemberships: jest.fn().mockResolvedValue([]),
    ensureMembershipFromLegacy: jest.fn(),
  };
  const dataSource = { query: jest.fn(), transaction: jest.fn() };
  const service = new UsersService(
    userRepository as any,
    personRepository as any,
    employeeRepository as any,
    personsService as any,
    membershipsService as any,
    dataSource as any,
  );
  return { service, userRepository, membershipsService };
}

describe('UsersService.deleteUser', () => {
  it('returns 404 when the user does not exist', async () => {
    const { service } = buildService(null);
    const res = await service.deleteUser('missing', makeCurrent());
    expect(res).toEqual({
      success: false,
      message: 'User not found',
      statusCode: 404,
    });
  });

  it('forbids self-deletion', async () => {
    const target = makeUser({ id: 'me' });
    const { service } = buildService(target);
    await expect(
      service.deleteUser('me', makeCurrent({ id: 'me' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forbids deleting nonDeletable users', async () => {
    const target = makeUser({
      id: 'seed-admin',
      rol: UserRole.SUPER_ADMIN,
      companyId: null,
      nonDeletable: true,
    });
    const { service } = buildService(target);
    await expect(
      service.deleteUser('seed-admin', makeCurrent({ id: 'other-super' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forbids deleting a SUPER_ADMIN from an ADMIN', async () => {
    const target = makeUser({
      id: 'super',
      rol: UserRole.SUPER_ADMIN,
      companyId: null,
      nonDeletable: false,
    });
    const { service } = buildService(target);
    await expect(
      service.deleteUser(
        'super',
        makeCurrent({
          id: 'admin-1',
          rol: UserRole.ADMIN,
          companyId: 'company-a',
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('soft-deletes a regular user when guardrails pass', async () => {
    const target = makeUser({
      id: 'op-1',
      rol: UserRole.OPERATOR,
      companyId: 'company-a',
      nonDeletable: false,
    });
    const { service, userRepository } = buildService(target);
    const res = await service.deleteUser(
      'op-1',
      makeCurrent({
        id: 'admin-1',
        rol: UserRole.ADMIN,
        companyId: 'company-a',
      }),
    );
    expect(res).toEqual({ success: true });
    expect(userRepository.softDelete).toHaveBeenCalledWith('op-1');
  });

  it('lets a SUPER_ADMIN delete another SUPER_ADMIN that is not protected', async () => {
    const target = makeUser({
      id: 'super-2',
      rol: UserRole.SUPER_ADMIN,
      companyId: null,
      nonDeletable: false,
    });
    const { service, userRepository } = buildService(target);
    const res = await service.deleteUser(
      'super-2',
      makeCurrent({ id: 'super-1', rol: UserRole.SUPER_ADMIN }),
    );
    expect(res).toEqual({ success: true });
    expect(userRepository.softDelete).toHaveBeenCalledWith('super-2');
  });
});
