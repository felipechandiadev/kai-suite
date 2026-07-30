import { Test, TestingModule } from '@nestjs/testing';
import { GetPermissionByIdQueryHandler } from '@modules/permissions/application/queries/handlers/get-permission-by-id.handler';
import { GetPermissionByIdQuery } from '@modules/permissions/application/queries/get-permission-by-id.query';
import { PermissionRepositoryPort } from '@modules/permissions/application/ports/permission.repository.port';
import { Permission } from '@modules/permissions/domain/permission.entity';

describe('GetPermissionByIdQueryHandler', () => {
  let handler: GetPermissionByIdQueryHandler;
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
        GetPermissionByIdQueryHandler,
        {
          provide: 'PermissionRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetPermissionByIdQueryHandler);
  });

  it('should return permission when repository finds it', async () => {
    const permission = new Permission('permission-1', 'read:users', 'user-1', 'desc');
    repository.findById.mockResolvedValueOnce(permission);

    const result = await handler.execute(new GetPermissionByIdQuery('permission-1'));

    expect(repository.findById).toHaveBeenCalledWith('permission-1');
    expect(result).toBe(permission);
  });

  it('should return null when repository does not find permission', async () => {
    repository.findById.mockResolvedValueOnce(null);

    const result = await handler.execute(new GetPermissionByIdQuery('missing'));

    expect(result).toBeNull();
  });
});