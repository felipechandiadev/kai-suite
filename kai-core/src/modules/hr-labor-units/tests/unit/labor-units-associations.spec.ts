import { BadRequestException, ConflictException } from '@nestjs/common';
import { LaborUnitsService } from '../../application/labor-units.service';

jest.mock('@common/tenant/tenant.context', () => ({
  TenantContext: {
    getCompanyId: () => 'company-1',
  },
}));

describe('LaborUnitsService.setAssociations', () => {
  const companyId = 'company-1';
  const laborUnitId = 'lu-1';
  const unitRow = {
    id: laborUnitId,
    companyId,
    code: 'UL00001',
    name: 'Cocina',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let repo: { findOne: jest.Mock; find: jest.Mock };
  let storageBridgeRepo: { find: jest.Mock; delete: jest.Mock; save: jest.Mock; create: jest.Mock };
  let branchBridgeRepo: { find: jest.Mock; delete: jest.Mock; save: jest.Mock; create: jest.Mock };
  let ouBridgeRepo: { find: jest.Mock; delete: jest.Mock; save: jest.Mock; create: jest.Mock };
  let puBridgeRepo: { find: jest.Mock; delete: jest.Mock; save: jest.Mock; create: jest.Mock };
  let branchRepo: { find: jest.Mock; findOne: jest.Mock };
  let storageRepo: { find: jest.Mock; findOne: jest.Mock };
  let ouRepo: { find: jest.Mock; findOne: jest.Mock };
  let puRepo: { find: jest.Mock; findOne: jest.Mock };
  let service: LaborUnitsService;

  function emptyBridgeRepo() {
    return {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue([]),
      create: jest.fn((row) => row),
    };
  }

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(unitRow),
      find: jest.fn().mockResolvedValue([unitRow]),
    };
    storageBridgeRepo = emptyBridgeRepo();
    branchBridgeRepo = emptyBridgeRepo();
    ouBridgeRepo = emptyBridgeRepo();
    puBridgeRepo = emptyBridgeRepo();
    branchRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    storageRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    ouRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    puRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    service = new LaborUnitsService(
      repo as never,
      storageBridgeRepo as never,
      branchBridgeRepo as never,
      ouBridgeRepo as never,
      puBridgeRepo as never,
      branchRepo as never,
      storageRepo as never,
      ouRepo as never,
      puRepo as never,
    );
  });

  it('replaces this unit branches without deleting by branchId (other ULs stay)', async () => {
    branchRepo.find.mockResolvedValue([{ id: 'br-1', companyId, name: 'Casa' }]);
    await service.setAssociations(laborUnitId, { branchIds: ['br-1'] });
    expect(branchBridgeRepo.delete).toHaveBeenCalledWith({
      companyId,
      laborUnitId,
    });
    expect(branchBridgeRepo.delete).not.toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'br-1' }),
    );
    expect(branchBridgeRepo.save).toHaveBeenCalled();
  });

  it('rejects unknown branch ids', async () => {
    branchRepo.find.mockResolvedValue([]);
    await expect(
      service.setAssociations(laborUnitId, { branchIds: ['missing'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects more than one production unit', async () => {
    await expect(
      service.setAssociations(laborUnitId, {
        productionUnitIds: ['pu-1', 'pu-2'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(puBridgeRepo.delete).not.toHaveBeenCalled();
  });

  it('409 when assigning labor units already bound to another production unit', async () => {
    puRepo.findOne.mockResolvedValue({ id: 'pu-new', companyId, name: 'Cocina B' });
    puBridgeRepo.find.mockResolvedValue([
      { laborUnitId, productionUnitId: 'pu-old', companyId },
    ]);
    puRepo.find.mockResolvedValue([{ id: 'pu-old', companyId, name: 'Cocina A' }]);
    await expect(
      service.syncProductionUnitLaborUnits('pu-new', [laborUnitId]),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
