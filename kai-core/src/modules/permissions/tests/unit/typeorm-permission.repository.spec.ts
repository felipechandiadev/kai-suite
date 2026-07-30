import { TypeOrmPermissionRepository } from '@modules/permissions/infrastructure/repositories/typeorm-permission.repository';
import { Permission } from '@modules/permissions/domain/permission.entity';

describe('TypeOrmPermissionRepository', () => {
  let repository: TypeOrmPermissionRepository;
  let ormRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    delete: jest.Mock;
  };
  let queryBuilder: {
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    ormRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      delete: jest.fn(),
    };

    repository = new TypeOrmPermissionRepository(ormRepository as any);
  });

  it('should map and save a permission', async () => {
    const permission = new Permission('permission-1', 'read:users', 'user-1', 'desc');
    ormRepository.save.mockResolvedValueOnce(undefined);

    await repository.save(permission);

    expect(ormRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'permission-1',
        ability: 'read:users',
        userId: 'user-1',
        description: 'desc',
      }),
    );
  });

  it('should return mapped permission by id', async () => {
    const now = new Date();
    ormRepository.findOne.mockResolvedValueOnce({
      id: 'permission-1',
      ability: 'read:users',
      userId: 'user-1',
      description: 'desc',
      createdAt: now,
      updatedAt: now,
    });

    const result = await repository.findById('permission-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'permission-1' } });
    expect(result).toBeInstanceOf(Permission);
    expect(result).toMatchObject({ id: 'permission-1', ability: 'read:users' });
  });

  it('should return null when permission does not exist', async () => {
    ormRepository.findOne.mockResolvedValueOnce(null);

    const result = await repository.findById('missing');

    expect(result).toBeNull();
  });

  it('should filter and paginate permissions', async () => {
    const now = new Date();
    queryBuilder.getManyAndCount.mockResolvedValueOnce([
      [
        {
          id: 'permission-1',
          ability: 'read:users',
          userId: 'user-1',
          description: 'desc',
          createdAt: now,
          updatedAt: now,
        },
      ],
      1,
    ]);

    const result = await repository.findAll('user-1', 'read:users', 20, 10);

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('permission');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('permission.userId = :userId', {
      userId: 'user-1',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('permission.ability = :ability', {
      ability: 'read:users',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('permission.createdAt', 'DESC');
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(20);
    expect(result[0][0]).toBeInstanceOf(Permission);
    expect(result[1]).toBe(1);
  });

  it('should delete permission by id', async () => {
    ormRepository.delete.mockResolvedValueOnce(undefined);

    await repository.delete('permission-1');

    expect(ormRepository.delete).toHaveBeenCalledWith('permission-1');
  });
});