import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { PermissionsServiceAdapter } from '@modules/permissions/application/services/permissions.service.adapter';
import { CreatePermissionCommand } from '@modules/permissions/application/commands/create-permission.command';
import { UpdatePermissionCommand } from '@modules/permissions/application/commands/update-permission.command';
import { RemovePermissionCommand } from '@modules/permissions/application/commands/remove-permission.command';
import { GetPermissionsQuery } from '@modules/permissions/application/queries/get-permissions.query';
import { GetPermissionByIdQuery } from '@modules/permissions/application/queries/get-permission-by-id.query';
import { Permission } from '@modules/permissions/domain/permission.entity';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('PermissionsServiceAdapter', () => {
  let service: PermissionsServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    service = new PermissionsServiceAdapter(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );

    jest.clearAllMocks();
  });

  it('should create permission and map fetched result to dto', async () => {
    const now = new Date();
    (uuidv4 as jest.Mock).mockReturnValueOnce('11111111-1111-4111-8111-111111111111');
    queryBus.execute.mockResolvedValueOnce(
      new Permission(
        '11111111-1111-4111-8111-111111111111',
        'read:users',
        'user-1',
        'Can read users',
        now,
        now,
      ),
    );

    const result = await service.createPermission(
      'read:users',
      'user-1',
      'Can read users',
    );

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(CreatePermissionCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      permissionId: '11111111-1111-4111-8111-111111111111',
      ability: 'read:users',
      userId: 'user-1',
      description: 'Can read users',
    });
    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetPermissionByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      permissionId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      ability: 'read:users',
      userId: 'user-1',
      description: 'Can read users',
      createdAt: now,
      updatedAt: now,
    });
  });

  it('should update permission and return mapped dto', async () => {
    const now = new Date();
    queryBus.execute.mockResolvedValueOnce(
      new Permission('permission-1', 'read:users', 'user-1', 'Updated', now, now),
    );

    const result = await service.updatePermission(
      'permission-1',
      'Updated',
      'admin-1',
    );

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdatePermissionCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      permissionId: 'permission-1',
      currentUserId: 'admin-1',
      description: 'Updated',
    });
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetPermissionByIdQuery);
    expect(result).toMatchObject({
      id: 'permission-1',
      description: 'Updated',
    });
  });

  it('should remove permission with default current user id', async () => {
    commandBus.execute.mockResolvedValueOnce(undefined);

    await service.removePermission('permission-1');

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(RemovePermissionCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      permissionId: 'permission-1',
      currentUserId: 'system',
    });
    expect(queryBus.execute).not.toHaveBeenCalled();
  });

  it('should fetch permissions and map list to dto response', async () => {
    const now = new Date();
    queryBus.execute.mockResolvedValueOnce({
      permissions: [
        new Permission('permission-1', 'read:users', 'user-1', 'desc', now, now),
      ],
      total: 1,
      limit: 25,
      offset: 5,
    });

    const result = await service.getPermissions('user-1', 'read:users', 25, 5);

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetPermissionsQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      ability: 'read:users',
      limit: 25,
      offset: 5,
    });
    expect(result).toEqual({
      permissions: [
        {
          id: 'permission-1',
          ability: 'read:users',
          userId: 'user-1',
          description: 'desc',
          createdAt: now,
          updatedAt: now,
        },
      ],
      total: 1,
      limit: 25,
      offset: 5,
    });
  });

  it('should return mapped permission by id', async () => {
    const now = new Date();
    queryBus.execute.mockResolvedValueOnce(
      new Permission('permission-1', 'read:users', 'user-1', 'desc', now, now),
    );

    const result = await service.getPermissionById('permission-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetPermissionByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ permissionId: 'permission-1' });
    expect(result).toEqual({
      id: 'permission-1',
      ability: 'read:users',
      userId: 'user-1',
      description: 'desc',
      createdAt: now,
      updatedAt: now,
    });
  });

  it('should return null when permission by id is missing', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    const result = await service.getPermissionById('missing');

    expect(result).toBeNull();
  });
});