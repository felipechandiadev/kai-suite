import { ProductionUnitCostingService } from '../../application/production-unit-costing.service';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { EmployeeStatus } from '@modules/employees/domain/employee.entity';
import { EmploymentContractStatus } from '@modules/employees/domain/employment-contract.enums';

jest.mock('@common/tenant/tenant.context', () => ({
  TenantContext: {
    getCompanyId: () => 'company-1',
  },
}));

describe('ProductionUnitCostingService', () => {
  const unitId = 'unit-1';
  const variantId = 'var-1';
  const companyId = 'company-1';

  let unitRepo: { findOne: jest.Mock };
  let puEmployeeRepo: { find: jest.Mock };
  let employeeRepo: { find: jest.Mock };
  let contractRepo: { find: jest.Mock };
  let variantRepo: { findOne: jest.Mock; find: jest.Mock };
  let txRepo: { createQueryBuilder: jest.Mock };
  let laborUnitsService: { listLaborUnitIdsForProductionUnit: jest.Mock };
  let recipesService: { list: jest.Mock };
  let service: ProductionUnitCostingService;

  const empViaLu = {
    id: 'emp-1',
    companyId,
    laborUnitId: 'lu-1',
    status: EmployeeStatus.ACTIVE,
    baseSalary: '500',
  };

  beforeEach(() => {
    unitRepo = {
      findOne: jest.fn().mockResolvedValue({ id: unitId, companyId }),
    };
    puEmployeeRepo = { find: jest.fn().mockResolvedValue([]) };
    employeeRepo = {
      find: jest.fn().mockImplementation(async ({ where }: any) => {
        if (where?.laborUnitId) return [empViaLu];
        if (where?.id) {
          const ids = Array.isArray(where.id) ? where.id : [where.id];
          // In() object — jest mock gets In() which is opaque; return by call order
          return [];
        }
        return [empViaLu];
      }),
    };
    contractRepo = {
      find: jest.fn().mockResolvedValue([
        {
          employeeId: 'emp-1',
          companyId,
          status: EmploymentContractStatus.ACTIVE,
          baseSalary: '1000',
          feeAmount: null,
          startDate: '2024-01-01',
        },
      ]),
    };
    variantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: variantId,
        companyId,
        laborCostOverride: null,
      }),
      find: jest.fn().mockResolvedValue([{ id: 'in-1', pmp: 50 }]),
    };
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: 0 }),
    };
    txRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    laborUnitsService = {
      listLaborUnitIdsForProductionUnit: jest.fn().mockResolvedValue(['lu-1']),
    };
    recipesService = {
      list: jest.fn().mockResolvedValue([
        {
          id: 'recipe-1',
          isActive: true,
          type: RecipeType.PRODUCTION,
          lines: [
            {
              inputVariantId: 'in-1',
              qtyPerOutputUnit: 2,
              wasteFactor: 0,
            },
          ],
        },
      ]),
    };

    service = new ProductionUnitCostingService(
      unitRepo as any,
      puEmployeeRepo as any,
      employeeRepo as any,
      contractRepo as any,
      variantRepo as any,
      txRepo as any,
      laborUnitsService as any,
      recipesService as any,
    );
  });

  it('returns null labor when no completed history (cold start)', async () => {
    const summary = await service.summarizeLaborCost(unitId, companyId);
    expect(summary.computedCapacity).toBeNull();
    expect(summary.laborCostPerUnit).toBeNull();
    expect(summary.monthlyPayrollTotal).toBe(1000);
    expect(summary.laborWarning).toMatch(/historial/i);
  });

  it('computes labor from payroll / pieces last 30d', async () => {
    const qb = txRepo.createQueryBuilder();
    qb.getRawOne.mockResolvedValue({ total: 100 });

    const summary = await service.summarizeLaborCost(unitId, companyId);
    expect(summary.computedCapacity).toBe(100);
    expect(summary.laborCostPerUnit).toBe(10);
    expect(summary.laborWarning).toBeFalsy();
  });

  it('includes direct-only employees without labor units', async () => {
    laborUnitsService.listLaborUnitIdsForProductionUnit.mockResolvedValue([]);
    puEmployeeRepo.find.mockResolvedValue([
      { employeeId: 'emp-2', productionUnitId: unitId, companyId },
    ]);
    const directEmp = {
      id: 'emp-2',
      companyId,
      laborUnitId: 'lu-other',
      status: EmployeeStatus.ACTIVE,
      baseSalary: '2000',
    };
    employeeRepo.find.mockResolvedValue([directEmp]);
    contractRepo.find.mockResolvedValue([]);
    const qb = txRepo.createQueryBuilder();
    qb.getRawOne.mockResolvedValue({ total: 100 });

    const summary = await service.summarizeLaborCost(unitId, companyId);
    expect(summary.directEmployeeIds).toEqual(['emp-2']);
    expect(summary.employeeCount).toBe(1);
    expect(summary.monthlyPayrollTotal).toBe(2000);
    expect(summary.laborCostPerUnit).toBe(20);
  });

  it('dedupes employee present via LU and direct', async () => {
    puEmployeeRepo.find.mockResolvedValue([
      { employeeId: 'emp-1', productionUnitId: unitId, companyId },
    ]);
    employeeRepo.find.mockImplementation(async () => [empViaLu]);
    const qb = txRepo.createQueryBuilder();
    qb.getRawOne.mockResolvedValue({ total: 50 });

    const summary = await service.summarizeLaborCost(unitId, companyId);
    expect(summary.employeeCount).toBe(1);
    expect(summary.monthlyPayrollTotal).toBe(1000);
    expect(summary.laborCostPerUnit).toBe(20);
  });

  it('uses variant laborCostOverride over history rate', async () => {
    const qb = txRepo.createQueryBuilder();
    qb.getRawOne.mockResolvedValue({ total: 100 });
    variantRepo.findOne.mockResolvedValue({
      id: variantId,
      companyId,
      laborCostOverride: 7.5,
    });

    const resolved = await service.resolveLaborPerPiece({
      productionUnitId: unitId,
      variantId,
      companyId,
    });
    expect(resolved.source).toBe('override');
    expect(resolved.laborPerPiece).toBe(7.5);

    const preview = await service.previewVariantUnitCost({
      productionUnitId: unitId,
      variantId,
      companyId,
    });
    expect(preview.laborSource).toBe('override');
    expect(preview.laborPerUnit).toBe(7.5);
    expect(preview.materialsPerUnit).toBe(100);
    expect(preview.unitCostPreview).toBe(107.5);
  });

  it('preview uses history labor when no override', async () => {
    const qb = txRepo.createQueryBuilder();
    qb.getRawOne.mockResolvedValue({ total: 50 });

    const preview = await service.previewVariantUnitCost({
      productionUnitId: unitId,
      variantId,
      companyId,
    });
    expect(preview.laborSource).toBe('history');
    expect(preview.laborPerUnit).toBe(20);
    expect(preview.materialsPerUnit).toBe(100);
    expect(preview.unitCostPreview).toBe(120);
  });
});
