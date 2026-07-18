import { BadRequestException } from '@nestjs/common';
import { ProductionUnitsService } from '../../application/production-units.service';
import {
  ProductionUnitInventoryMode,
  ProductionUnitScope,
} from '../../domain/production-unit.enums';
import { StorageCategory } from '@modules/storages/domain/storage.entity';

jest.mock('@common/tenant/tenant.context', () => ({
  TenantContext: {
    getCompanyId: () => 'company-1',
  },
}));

describe('ProductionUnitsService inventory storages', () => {
  const companyId = 'company-1';
  const branchId = 'branch-1';
  const inputId = 'storage-in';
  const outputId = 'storage-out';

  let productionUnitRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    exist: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let branchRepository: { findOne: jest.Mock };
  let storageRepository: { findOne: jest.Mock; save: jest.Mock };
  let service: ProductionUnitsService;

  const sharedStorage = {
    id: inputId,
    companyId,
    branchId,
    name: 'Bodega',
    category: StorageCategory.IN_BRANCH,
    isActive: true,
    productionUnitId: null,
  };

  const productionInputStorage = {
    id: inputId,
    companyId,
    branchId,
    name: 'Cocina · Insumos',
    category: StorageCategory.PRODUCTION_INPUT,
    isActive: true,
    productionUnitId: null,
  };

  const outputStorage = {
    id: outputId,
    companyId,
    branchId,
    name: 'Sala',
    category: StorageCategory.IN_BRANCH,
    isActive: true,
    productionUnitId: null,
  };

  beforeEach(() => {
    productionUnitRepository = {
      create: jest.fn((row) => ({ ...row, id: 'unit-1' })),
      save: jest.fn(async (row) => ({ id: 'unit-1', ...row })),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      exist: jest.fn().mockResolvedValue(false),
      createQueryBuilder: jest.fn(),
    };
    branchRepository = {
      findOne: jest.fn().mockResolvedValue({ id: branchId, companyId }),
    };
    storageRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (row) => row),
    };
    service = new ProductionUnitsService(
      productionUnitRepository as any,
      branchRepository as any,
      storageRepository as any,
    );
  });

  it('rejects create without input or output storage', async () => {
    await expect(
      service.create({
        name: 'Cocina',
        branchId,
        inventoryMode: ProductionUnitInventoryMode.DEPENDENT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates DEPENDENT unit with shared storages (input === output)', async () => {
    storageRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where.id === inputId) return { ...sharedStorage };
      return null;
    });
    productionUnitRepository.findOne.mockResolvedValue({
      id: 'unit-1',
      companyId,
      branchId,
      scope: ProductionUnitScope.BRANCH,
      inventoryMode: ProductionUnitInventoryMode.DEPENDENT,
      code: 'UPR00001',
      name: 'Cocina',
      defaultInputStorageId: inputId,
      defaultOutputStorageId: inputId,
      isActive: true,
    });

    const unit = await service.create({
      name: 'Cocina',
      branchId,
      inventoryMode: ProductionUnitInventoryMode.DEPENDENT,
      defaultInputStorageId: inputId,
      defaultOutputStorageId: inputId,
    });

    expect(unit.defaultInputStorageId).toBe(inputId);
    expect(unit.defaultOutputStorageId).toBe(inputId);
  });

  it('rejects DEPENDENT unit using PRODUCTION_INPUT storage', async () => {
    storageRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where.id === inputId) return { ...productionInputStorage };
      if (where.id === outputId) return { ...outputStorage };
      return null;
    });

    await expect(
      service.create({
        name: 'Cocina',
        branchId,
        inventoryMode: ProductionUnitInventoryMode.DEPENDENT,
        defaultInputStorageId: inputId,
        defaultOutputStorageId: outputId,
      }),
    ).rejects.toThrow(/dependientes no pueden usar/);
  });

  it('creates AUTONOMOUS unit with exclusive PRODUCTION_INPUT', async () => {
    storageRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where.id === inputId) return { ...productionInputStorage };
      if (where.id === outputId) return { ...outputStorage };
      return null;
    });
    productionUnitRepository.findOne
      .mockResolvedValueOnce(null) // otherOwner check
      .mockResolvedValueOnce({
        id: 'unit-1',
        companyId,
        branchId,
        scope: ProductionUnitScope.BRANCH,
        inventoryMode: ProductionUnitInventoryMode.AUTONOMOUS,
        code: 'UPR00001',
        name: 'Pastelería',
        defaultInputStorageId: inputId,
        defaultOutputStorageId: outputId,
        isActive: true,
      });

    const unit = await service.create({
      name: 'Pastelería',
      branchId,
      inventoryMode: ProductionUnitInventoryMode.AUTONOMOUS,
      defaultInputStorageId: inputId,
      defaultOutputStorageId: outputId,
    });

    expect(unit.inventoryMode).toBe(ProductionUnitInventoryMode.AUTONOMOUS);
    expect(storageRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: inputId,
        productionUnitId: 'unit-1',
      }),
    );
  });

  it('rejects AUTONOMOUS when input === output', async () => {
    storageRepository.findOne.mockResolvedValue({
      ...productionInputStorage,
      id: inputId,
    });

    await expect(
      service.create({
        name: 'Pastelería',
        branchId,
        inventoryMode: ProductionUnitInventoryMode.AUTONOMOUS,
        defaultInputStorageId: inputId,
        defaultOutputStorageId: inputId,
      }),
    ).rejects.toThrow(/deben ser distintos/);
  });

  it('rejects AUTONOMOUS when another unit already owns the input storage', async () => {
    storageRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where.id === inputId) {
        return { ...productionInputStorage, productionUnitId: 'other-unit' };
      }
      if (where.id === outputId) return { ...outputStorage };
      return null;
    });

    await expect(
      service.create({
        name: 'Pastelería 2',
        branchId,
        inventoryMode: ProductionUnitInventoryMode.AUTONOMOUS,
        defaultInputStorageId: inputId,
        defaultOutputStorageId: outputId,
      }),
    ).rejects.toThrow(/asignado de forma exclusiva/);
  });
});
