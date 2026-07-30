import { Test, TestingModule } from '@nestjs/testing';
import {
  GetAllStoragesQuery,
  GetStorageByIdQuery,
} from '@modules/storages/application/queries/get-all-storages.query';
import {
  GetAllStoragesQueryHandler,
  GetStorageByIdQueryHandler,
} from '@modules/storages/application/handlers/queries/get-all-storages.handler';
import {
  STORAGES_REPOSITORY,
  StoragesRepositoryPort,
} from '@modules/storages/application/ports/storages.repository.port';
import { StorageCategory, StorageType } from '@modules/storages/domain/storage.entity';

describe('Storages query handlers', () => {
  let getAllHandler: GetAllStoragesQueryHandler;
  let getByIdHandler: GetStorageByIdQueryHandler;
  let repository: jest.Mocked<StoragesRepositoryPort>;

  const storageDto = {
    id: 'storage-1',
    name: 'Main Storage',
    type: StorageType.WAREHOUSE,
    category: StorageCategory.IN_BRANCH,
    isDefault: true,
    isActive: true,
  };

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllStoragesQueryHandler,
        GetStorageByIdQueryHandler,
        {
          provide: STORAGES_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();

    getAllHandler = module.get(GetAllStoragesQueryHandler);
    getByIdHandler = module.get(GetStorageByIdQueryHandler);
  });

  it('should fetch storages with mapped repository options', async () => {
    repository.findAll.mockResolvedValueOnce([storageDto]);

    const result = await getAllHandler.execute(
      new GetAllStoragesQuery(true, 20, 10),
    );

    expect(repository.findAll).toHaveBeenCalledWith({
      activeOnly: false,
      orderBy: 'name',
      limit: 20,
      offset: 10,
    });
    expect(result).toEqual([storageDto]);
  });

  it('should fetch storage by id', async () => {
    repository.findById.mockResolvedValueOnce(storageDto);

    const result = await getByIdHandler.execute(
      new GetStorageByIdQuery('storage-1'),
    );

    expect(repository.findById).toHaveBeenCalledWith('storage-1');
    expect(result).toEqual(storageDto);
  });

  it('should return null when storage does not exist', async () => {
    repository.findById.mockResolvedValueOnce(null);

    const result = await getByIdHandler.execute(
      new GetStorageByIdQuery('missing-storage'),
    );

    expect(result).toBeNull();
  });
});