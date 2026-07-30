import { Test, TestingModule } from '@nestjs/testing';
import { GetAllSuppliersQueryHandler } from '@modules/suppliers/application/handlers/queries/get-all-suppliers.handler';
import { GetAllSuppliersQuery } from '@modules/suppliers/application/queries/get-all-suppliers.query';
import {
  SUPPLIERS_REPOSITORY,
  SuppliersRepositoryPort,
} from '@modules/suppliers/application/ports/suppliers.repository.port';
import { SupplierType } from '@modules/suppliers/domain/supplier.entity';

describe('GetAllSuppliersQueryHandler', () => {
  let handler: GetAllSuppliersQueryHandler;
  let repository: jest.Mocked<SuppliersRepositoryPort>;

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllSuppliersQueryHandler,
        {
          provide: SUPPLIERS_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetAllSuppliersQueryHandler);
  });

  it('should delegate filters and pagination to repository', async () => {
    repository.findAll.mockResolvedValueOnce([{ id: 'supplier-1' } as any]);
    repository.count.mockResolvedValueOnce(1);

    const result = await handler.execute(
      new GetAllSuppliersQuery(20, 10, true, SupplierType.DISTRIBUTOR),
    );

    expect(repository.findAll).toHaveBeenCalledWith({
      where: { isActive: true, supplierType: SupplierType.DISTRIBUTOR },
      take: 20,
      skip: 10,
      relations: ['person'],
      order: { createdAt: 'DESC' },
    });
    expect(repository.count).toHaveBeenCalledWith({
      where: { isActive: true, supplierType: SupplierType.DISTRIBUTOR },
    });
    expect(result).toEqual({ data: [{ id: 'supplier-1' }], total: 1 });
  });

  it('should omit optional filters when not provided', async () => {
    repository.findAll.mockResolvedValueOnce([]);
    repository.count.mockResolvedValueOnce(0);

    const result = await handler.execute(new GetAllSuppliersQuery());

    expect(repository.findAll).toHaveBeenCalledWith({
      where: {},
      take: 50,
      skip: 0,
      relations: ['person'],
      order: { createdAt: 'DESC' },
    });
    expect(repository.count).toHaveBeenCalledWith({ where: {} });
    expect(result).toEqual({ data: [], total: 0 });
  });
});