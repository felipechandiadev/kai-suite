import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { StoragesServiceAdapter } from '@modules/storages/application/storages.service.adapter';
import {
  GetAllStoragesQuery,
  GetStorageByIdQuery,
} from '@modules/storages/application/queries/get-all-storages.query';

describe('StoragesServiceAdapter', () => {
  let service: StoragesServiceAdapter;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoragesServiceAdapter,
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    service = module.get(StoragesServiceAdapter);
  });

  it('should dispatch GetAllStoragesQuery', async () => {
    queryBus.execute.mockResolvedValueOnce([]);

    await service.getAllStorages(true, 10, 5);

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAllStoragesQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      includeInactive: true,
      limit: 10,
      offset: 5,
    });
  });

  it('should dispatch GetStorageByIdQuery', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    await service.getStorageById('storage-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetStorageByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ id: 'storage-1' });
  });
});