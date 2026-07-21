import { NotFoundException } from '@nestjs/common';
import { EmployeeSalesCommissionsService } from '@modules/employees/application/employee-sales-commissions.service';
import { SalesCommissionType } from '@modules/employees/domain/employment-contract.enums';
import {
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';

jest.mock('@common/tenant/tenant.context', () => ({
  TenantContext: {
    getCompanyId: () => 'co-1',
  },
}));

describe('EmployeeSalesCommissionsService', () => {
  let service: EmployeeSalesCommissionsService;
  let employees: { findOne: jest.Mock };
  let contracts: { findOne: jest.Mock };
  let users: { createQueryBuilder: jest.Mock };
  let transactions: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let pointsOfSale: { find: jest.Mock };

  const employee = {
    id: 'emp-1',
    companyId: 'co-1',
    personId: 'person-1',
  };

  beforeEach(() => {
    employees = {
      findOne: jest.fn().mockResolvedValue(employee),
    };
    contracts = {
      findOne: jest.fn().mockResolvedValue({
        salesCommissionType: SalesCommissionType.PERCENT,
        salesCommissionValue: '3',
      }),
    };
    const userQb = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
    };
    users = { createQueryBuilder: jest.fn().mockReturnValue(userQb) };
    transactions = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
    };
    pointsOfSale = { find: jest.fn().mockResolvedValue([]) };
    service = new EmployeeSalesCommissionsService(
      employees as any,
      contracts as any,
      users as any,
      transactions as any,
      pointsOfSale as any,
    );
  });

  it('returns enabled=false when contract is not PERCENT', async () => {
    contracts.findOne.mockResolvedValueOnce({
      salesCommissionType: SalesCommissionType.NONE,
      salesCommissionValue: null,
    });
    const out = await service.getSummary('emp-1');
    expect(out.enabled).toBe(false);
    expect(out.months).toEqual([]);
  });

  it('aggregates PERCENT commission on SALE.total (bruto)', async () => {
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    transactions.find.mockResolvedValueOnce([
      {
        id: 's1',
        total: 10000,
        createdAt: new Date(`${ym}-10T12:00:00.000Z`),
        pointOfSaleId: 'pos-1',
      },
      {
        id: 's2',
        total: 20000,
        createdAt: new Date(`${ym}-11T12:00:00.000Z`),
        pointOfSaleId: 'pos-1',
      },
    ]);
    const out = await service.getSummary('emp-1', 1);
    expect(out.enabled).toBe(true);
    expect(out.percent).toBe(3);
    expect(out.linked).toBe(true);
    const month = out.months.find((m) => m.yearMonth === ym);
    expect(month).toEqual({
      yearMonth: ym,
      salesCount: 2,
      salesGrossTotal: 30000,
      commissionTotal: 900,
    });
  });

  it('returns empty months when no POS users linked', async () => {
    users.createQueryBuilder().getMany.mockResolvedValueOnce([]);
    const out = await service.getSummary('emp-1', 1);
    expect(out.linked).toBe(false);
    expect(out.months[0].salesCount).toBe(0);
  });

  it('throws when employee missing', async () => {
    employees.findOne.mockResolvedValueOnce(null);
    await expect(service.getSummary('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('listSales returns paginated rows with commission', async () => {
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 's1',
          documentNumber: 'VTA1',
          total: 10000,
          createdAt: new Date(`${ym}-05T12:00:00.000Z`),
          pointOfSaleId: 'pos-1',
          transactionType: TransactionType.SALE,
          status: TransactionStatus.CONFIRMED,
        },
      ]),
    };
    transactions.createQueryBuilder.mockReturnValue(qb);
    pointsOfSale.find.mockResolvedValueOnce([{ id: 'pos-1', name: 'Caja 1' }]);

    const out = await service.listSales('emp-1', ym, 1, 25);
    expect(out.enabled).toBe(true);
    expect(out.total).toBe(1);
    expect(out.items[0]).toMatchObject({
      documentNumber: 'VTA1',
      total: 10000,
      commission: 300,
      pointOfSaleName: 'Caja 1',
    });
  });
});
