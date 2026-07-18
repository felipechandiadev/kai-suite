import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SuppliersServiceAdapter } from '@modules/suppliers/application/suppliers.service.adapter';
import { CreateSupplierCommand } from '@modules/suppliers/application/commands/create-supplier.command';
import { UpdateSupplierCommand } from '@modules/suppliers/application/commands/update-supplier.command';
import { RemoveSupplierCommand } from '@modules/suppliers/application/commands/remove-supplier.command';
import { SupplierType } from '@modules/suppliers/domain/supplier.entity';

describe('SuppliersServiceAdapter', () => {
  let service: SuppliersServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let personsService: { create: jest.Mock };
  let suppliersRepository: { findOne: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    personsService = { create: jest.fn() };
    suppliersRepository = { findOne: jest.fn().mockResolvedValue(null) };

    service = new SuppliersServiceAdapter(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
      personsService as any,
      suppliersRepository as any,
    );
  });

  it('should dispatch CreateSupplierCommand', async () => {
    commandBus.execute.mockResolvedValueOnce({ id: 'supplier-1' });

    await service.create({
      personId: 'person-1',
      supplierType: SupplierType.DISTRIBUTOR,
      defaultPaymentTermDays: 30,
      alias: 'Main supplier',
      notes: 'notes',
    });

    expect(suppliersRepository.findOne).toHaveBeenCalled();
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(CreateSupplierCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      personId: 'person-1',
      supplierType: SupplierType.DISTRIBUTOR,
      defaultPaymentTermDays: 30,
      userId: 'system-user',
      alias: 'Main supplier',
      notes: 'notes',
    });
  });

  it('should reject when person already has a supplier', async () => {
    suppliersRepository.findOne.mockResolvedValueOnce({ id: 'existing' });
    await expect(
      service.create({
        personId: 'person-1',
        supplierType: SupplierType.DISTRIBUTOR,
        defaultPaymentTermDays: 0,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining('proveedor') });
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('should dispatch UpdateSupplierCommand', async () => {
    commandBus.execute.mockResolvedValueOnce({ id: 'supplier-1' });

    await service.update('supplier-1', {
      supplierType: SupplierType.DISTRIBUTOR,
      alias: 'Updated alias',
      defaultPaymentTermDays: 45,
      isActive: true,
      notes: 'updated notes',
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdateSupplierCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      supplierId: 'supplier-1',
      userId: 'system-user',
      supplierType: SupplierType.DISTRIBUTOR,
      alias: 'Updated alias',
      defaultPaymentTermDays: 45,
      isActive: true,
      notes: 'updated notes',
    });
  });

  it('should dispatch RemoveSupplierCommand', async () => {
    commandBus.execute.mockResolvedValueOnce(undefined);

    await service.remove('supplier-1');

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(RemoveSupplierCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      supplierId: 'supplier-1',
      userId: 'system-user',
    });
  });
});