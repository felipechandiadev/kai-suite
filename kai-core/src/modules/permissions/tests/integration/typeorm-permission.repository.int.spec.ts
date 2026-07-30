import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmPermissionRepository } from '../../infrastructure/repositories/typeorm-permission.repository';
import { PermissionOrmEntity } from '../../infrastructure/orm-entities/permission.orm-entity';
import { Permission } from '../../domain/permission.entity';

describe('TypeOrmPermissionRepository', () => {
  let repository: TypeOrmPermissionRepository;
  let mockOrmRepository: jest.Mocked<Repository<PermissionOrmEntity>>;

  beforeEach(async () => {
    const mockRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmPermissionRepository,
        {
          provide: getRepositoryToken(PermissionOrmEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<TypeOrmPermissionRepository>(
      TypeOrmPermissionRepository,
    );
    mockOrmRepository = module.get(getRepositoryToken(PermissionOrmEntity));
  });

  it('should save a permission', async () => {
    const permission = Permission.create(
      '1',
      'read:users',
      'user-1',
      'Can read users',
    );

    await repository.save(permission);

    expect(mockOrmRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should find a permission by id', async () => {
    const mockOrmEntity = {
      id: '1',
      ability: 'read:users',
      userId: 'user-1',
      description: 'Can read users',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockOrmRepository.findOne.mockResolvedValue(mockOrmEntity);

    const result = await repository.findById('1');

    expect(result).toBeInstanceOf(Permission);
    expect(result?.id).toBe('1');
    expect(result?.ability).toBe('read:users');
  });

  it('should return null when permission not found', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);

    const result = await repository.findById('non-existent');

    expect(result).toBeNull();
  });
});
