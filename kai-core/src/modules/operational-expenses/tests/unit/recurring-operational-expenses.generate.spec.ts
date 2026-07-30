import { GoneException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RecurringOperationalExpensesService } from '../../application/recurring-operational-expenses.service';
import { RecurringOperationalExpense } from '../../domain/recurring-operational-expense.entity';
import { RecurringOperationalExpenseRun } from '../../domain/recurring-operational-expense-run.entity';
import {
  OperationalExpense,
  OperationalExpenseDocumentKind,
} from '../../domain/operational-expense.entity';

describe('RecurringOperationalExpensesService templates', () => {
  const templateRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
    findAndCount: jest.fn(),
  } as unknown as Repository<RecurringOperationalExpense>;

  const runRepo = {
    find: jest.fn(),
  } as unknown as Repository<RecurringOperationalExpenseRun>;

  const oeRepo = {
    findOne: jest.fn(),
  } as unknown as Repository<OperationalExpense>;

  const service = new RecurringOperationalExpensesService(
    templateRepo,
    runRepo,
    oeRepo,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generate throws GoneException (manual templates)', async () => {
    await expect(service.generate('any-id')).rejects.toBeInstanceOf(
      GoneException,
    );
  });

  it('createFromOperatingExpense copies identity fields without amounts', async () => {
    const oe = {
      id: 'oe-1',
      companyId: 'co-1',
      branchId: 'br-1',
      name: 'Arriendo local',
      description: 'Mensual',
      categoryId: 'cat-1',
      supplierId: 'sup-1',
      documentKind: OperationalExpenseDocumentKind.SUPPLIER_INVOICE,
      metadata: null,
    } as unknown as OperationalExpense;

    (oeRepo.findOne as jest.Mock).mockResolvedValue(oe);
    (templateRepo.save as jest.Mock).mockImplementation(async (x) => ({
      ...x,
      id: 'tpl-1',
    }));

    const row = await service.createFromOperatingExpense({
      companyId: 'co-1',
      operationalExpenseId: 'oe-1',
      createdBy: 'user-1',
      taxId: 'tax-1',
    });

    expect(templateRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Arriendo local',
        categoryId: 'cat-1',
        supplierId: 'sup-1',
        documentKind: OperationalExpenseDocumentKind.SUPPLIER_INVOICE,
        taxId: 'tax-1',
        amountNet: null,
        taxAmount: null,
        total: null,
        frequency: null,
        nextRunAt: null,
        sourceOperationalExpenseId: 'oe-1',
        isActive: true,
      }),
    );
    expect(row.id).toBe('tpl-1');
  });
});
