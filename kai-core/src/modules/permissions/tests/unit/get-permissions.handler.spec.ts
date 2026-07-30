import { Test, TestingModule } from '@nestjs/testing';
import { GetPermissionsQueryHandler } from '@modules/permissions/application/queries/handlers/get-permissions.handler';
import { GetPermissionsQuery } from '@modules/permissions/application/queries/get-permissions.query';
import { PermissionRepositoryPort } from '@modules/permissions/application/ports/permission.repository.port';
import { Permission } from '@modules/permissions/domain/permission.entity';

describe('GetPermissionsQueryHandler', () => {
  let handler: GetPermissionsQueryHandler;
  let repository: jest.Mocked<PermissionRepositoryPort>;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPermissionsQueryHandler,
        {
          provide: 'PermissionRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetPermissionsQueryHandler);
  });

  it('should return repository results with pagination metadata', async () => {
    const permission = new Permission('permission-1', 'read:users', 'user-1', 'desc');
    repository.findAll.mockResolvedValueOnce([[permission], 1]);

    const result = await handler.execute(
      new GetPermissionsQuery('user-1', 'read:users', 20, 10),
    );

    expect(repository.findAll).toHaveBeenCalledWith('user-1', 'read:users', 20, 10);
    expect(result).toEqual({
      permissions: [permission],
      total: 1,
      limit: 20,
      offset: 10,
    });
  });

  it('should preserve default pagination values from query', async () => {
    repository.findAll.mockResolvedValueOnce([[], 0]);

    const result = await handler.execute(new GetPermissionsQuery());

    expect(repository.findAll).toHaveBeenCalledWith(undefined, undefined, 50, 0);
    expect(result).toEqual({
      permissions: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
  });
});