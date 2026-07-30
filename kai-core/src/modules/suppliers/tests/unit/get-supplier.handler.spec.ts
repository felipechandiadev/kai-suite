import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetSupplierQueryHandler } from '@modules/suppliers/application/handlers/queries/get-supplier.handler';
import { GetSupplierQuery } from '@modules/suppliers/application/queries/get-supplier.query';
import {
  SUPPLIERS_REPOSITORY,
  SuppliersRepositoryPort,
} from '@modules/suppliers/application/ports/suppliers.repository.port';
import { SupplierType } from '@modules/suppliers/domain/supplier.entity';

describe('GetSupplierQueryHandler', () => {
  let handler: GetSupplierQueryHandler;
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
        GetSupplierQueryHandler,
        {
          provide: SUPPLIERS_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetSupplierQueryHandler);
  });

  it('should return supplier when repository finds it', async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 'supplier-1',
      personId: 'person-1',
      supplierType: SupplierType.DISTRIBUTOR,
      alias: 'Alias',
    } as any);

    const result = await handler.execute(new GetSupplierQuery('supplier-1'));

    expect(repository.findOne).toHaveBeenCalledWith('supplier-1');
    expect(result).toMatchObject({
      id: 'supplier-1',
      personId: 'person-1',
      supplierType: SupplierType.DISTRIBUTOR,
    });
  });

  it('should throw when supplier does not exist', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(handler.execute(new GetSupplierQuery('missing'))).rejects.toThrow(
      new NotFoundException('Supplier missing not found'),
    );
  });
});