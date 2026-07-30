import { TypeOrmAnalyticsRepository } from '@modules/analytics/infrastructure/repositories/typeorm-analytics.repository';
import {
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { CashSessionStatus } from '@modules/cash-sessions/domain/cash-session.entity';
import { EmployeeStatus } from '@modules/employees/domain/employee.entity';
import { OperationalExpenseStatus } from '@modules/operational-expenses/domain/operational-expense.entity';
import { InstallmentStatus } from '@modules/installments/domain/installment.entity';

describe('TypeOrmAnalyticsRepository', () => {
  let repository: TypeOrmAnalyticsRepository;
  let customerRepository: { count: jest.Mock; createQueryBuilder: jest.Mock };
  let transactionRepository: { count: jest.Mock; createQueryBuilder: jest.Mock };
  let stockLevelRepository: { count: jest.Mock; createQueryBuilder: jest.Mock };
  let cashSessionRepository: { count: jest.Mock; createQueryBuilder: jest.Mock };
  let employeeRepository: { count: jest.Mock };
  let operationalExpenseRepository: { count: jest.Mock; createQueryBuilder: jest.Mock };
  let installmentRepository: { count: jest.Mock; createQueryBuilder: jest.Mock };
  let txQb: Record<string, jest.Mock>;
  let customerQb: Record<string, jest.Mock>;
  let stockQb: Record<string, jest.Mock>;
  let expenseQb: Record<string, jest.Mock>;
  let installmentQb: Record<string, jest.Mock>;

  const companyId = 'company-1';
  const period = {
    from: new Date('2026-05-01T00:00:00.000Z'),
    to: new Date('2026-05-27T23:59:59.999Z'),
  };

  beforeEach(() => {
    txQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '1000', total: '5000', count: '10' }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(3),
    };
    customerQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
    };
    stockQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(4),
    };
    expenseQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ count: '4', total: '800', net: '600' }),
    };
    installmentQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '1200' }),
    };

    customerRepository = {
      count: jest.fn().mockResolvedValue(15),
      createQueryBuilder: jest.fn().mockReturnValue(customerQb),
    };
    transactionRepository = {
      count: jest.fn().mockResolvedValue(7),
      createQueryBuilder: jest.fn().mockReturnValue(txQb),
    };
    stockLevelRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(stockQb),
    };
    cashSessionRepository = {
      count: jest.fn().mockResolvedValue(2),
      createQueryBuilder: jest.fn().mockReturnValue(txQb),
    };
    employeeRepository = { count: jest.fn().mockResolvedValue(8) };
    operationalExpenseRepository = {
      count: jest.fn().mockResolvedValue(1),
      createQueryBuilder: jest.fn().mockReturnValue(expenseQb),
    };
    installmentRepository = {
      count: jest.fn().mockResolvedValue(5),
      createQueryBuilder: jest.fn().mockReturnValue(installmentQb),
    };
    repository = new TypeOrmAnalyticsRepository(
      customerRepository as never,
      transactionRepository as never,
      stockLevelRepository as never,
      cashSessionRepository as never,
      employeeRepository as never,
      operationalExpenseRepository as never,
      installmentRepository as never,
    );
  });

  it('should build dashboard with company filter and legacy fields', async () => {
    const result = await repository.getDashboard(companyId, period, {});

    expect(stockLevelRepository.createQueryBuilder).toHaveBeenCalled();
    expect(stockQb.getCount).toHaveBeenCalled();
    expect(customerRepository.count).toHaveBeenCalledWith({
      where: { companyId, isActive: true },
    });
    expect(transactionRepository.createQueryBuilder).toHaveBeenCalled();
    expect(result.salesToday).toBe(1000);
    expect(result.totalCustomers).toBe(15);
    expect(result.lowStockItems).toBe(4);
    expect(result.openOrders).toBe(7);
    expect(result.sales.mtd).toBe(5000);
    expect(result.sales.mtdCount).toBe(10);
    expect(result.commercial.activeCustomers).toBe(15);
  });

  it('should return operation queue items', async () => {
    const ops = await repository.getOperationsQueues(companyId, period);

    expect(ops.length).toBeGreaterThan(0);
    expect(ops.some((o) => o.key === 'open_purchase_orders')).toBe(true);
  });
});
