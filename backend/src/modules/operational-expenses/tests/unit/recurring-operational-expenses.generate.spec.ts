import { DataSource, Repository } from 'typeorm';
import { RecurringOperationalExpensesService } from '../../application/recurring-operational-expenses.service';
import {
  RecurringOperationalExpense,
  RecurringOperationalExpenseFrequency,
} from '../../domain/recurring-operational-expense.entity';
import {
  RecurringOperationalExpenseRun,
  RecurringOperationalExpenseRunStatus,
} from '../../domain/recurring-operational-expense-run.entity';
import { OperationalExpenseDocumentKind } from '../../domain/operational-expense.entity';
import { OperationalExpensesService } from '../../application/operational-expenses.service';
import { periodKeyFor } from '../../application/recurring-operational-expense-schedule.util';

describe('RecurringOperationalExpensesService.generate idempotency', () => {
  const templateId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const companyId = '11111111-2222-3333-4444-555555555555';
  const at = new Date(Date.UTC(2026, 6, 20));
  const periodKey = periodKeyFor(
    at,
    RecurringOperationalExpenseFrequency.MONTHLY,
  );

  const template = {
    id: templateId,
    companyId,
    branchId: null,
    name: 'Arriendo',
    description: null,
    categoryId: 'cat-1',
    supplierId: 'sup-1',
    documentKind: OperationalExpenseDocumentKind.OTHER,
    amountNet: '100000',
    taxAmount: '0',
    total: '100000',
    taxId: null,
    frequency: RecurringOperationalExpenseFrequency.MONTHLY,
    dayOfWeek: null,
    dayOfMonth: 1,
    nextRunAt: at,
    lastRunAt: null,
    isActive: true,
    createdBy: 'user-1',
    createdAt: at,
    updatedAt: at,
  } as RecurringOperationalExpense;

  it('skips when SUCCESS run already exists for period', async () => {
    const existingRun = {
      id: 'run-1',
      companyId,
      recurringExpenseId: templateId,
      periodKey,
      operationalExpenseId: 'oe-existing',
      status: RecurringOperationalExpenseRunStatus.SUCCESS,
      errorMessage: null,
      ranAt: at,
    } as RecurringOperationalExpenseRun;

    const templateRepo = {
      findOne: jest.fn().mockResolvedValue(template),
      save: jest.fn(),
    } as unknown as Repository<RecurringOperationalExpense>;

    const runRepo = {
      findOne: jest.fn().mockResolvedValue(existingRun),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as Repository<RecurringOperationalExpenseRun>;

    const operationalExpenses = {
      create: jest.fn(),
    } as unknown as OperationalExpensesService;

    const service = new RecurringOperationalExpensesService(
      templateRepo,
      runRepo,
      operationalExpenses,
      {} as DataSource,
    );

    const result = await service.generate(templateId, {
      at,
      advanceSchedule: true,
    });

    expect(result.skipped).toBe(true);
    expect(result.operationalExpenseId).toBe('oe-existing');
    expect(operationalExpenses.create).not.toHaveBeenCalled();
  });
});
