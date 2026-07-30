import { BadRequestException } from '@nestjs/common';
import { OperationalExpensesService } from '@modules/operational-expenses/application/operational-expenses.service';
import {
  OperationalExpenseDocumentKind,
  OperationalExpenseStatus,
} from '@modules/operational-expenses/domain/operational-expense.entity';
import { PaymentStatus } from '@modules/transactions/domain/transaction.entity';

describe('OperationalExpensesService.create', () => {
  const baseDto = {
    companyId: 'company-1',
    categoryId: 'cat-1',
    supplierId: 'sup-1',
    name: 'Gasto test',
    referenceNumber: 'F-100',
    operationDate: '2026-06-01',
    createdBy: 'user-1',
    documentKind: OperationalExpenseDocumentKind.SUPPLIER_INVOICE,
    fiscalAmounts: { subtotal: 10000, taxAmount: 1900, total: 11900 },
    supplierDocumentPayment: {
      mode: 'PENDING',
      paidLines: [],
      scheduledLines: [],
    },
  };

  function buildService(deps: Partial<Record<string, unknown>> = {}) {
    const repository = {
      create: jest.fn(async (data: unknown) => ({ id: 'oe-1', ...(data as object) })),
      update: jest.fn(async () => ({})),
      remove: jest.fn(async () => undefined),
      findOne: jest.fn(async () => ({
        id: 'oe-1',
        status: OperationalExpenseStatus.APPROVED,
        paymentStatus: PaymentStatus.PENDING,
      })),
    };
    const multimediaService = {
      link: jest.fn(),
      listByEntity: jest.fn(async () => []),
    };
    const supplierFiscalDocumentCreate = {
      create: jest.fn(async () => ({
        fiscalDocId: 'fiscal-1',
        paymentStatus: PaymentStatus.PENDING,
        transaction: { id: 'fiscal-1' },
      })),
    };
    const operatingExpensePaymentPlan = {
      createWithPaymentPlan: jest.fn(async () => ({
        operatingExpenseTransactionId: 'op-tx-1',
        paymentStatus: PaymentStatus.PENDING,
      })),
    };
    const branchRepo = {
      findOne: jest.fn(async () => ({ id: 'branch-1', companyId: 'company-1' })),
    };
    const transactionRepo = {
      findOne: jest.fn(async () => null),
    };
    const recurringTemplates = {
      createFromOperatingExpense: jest.fn(async () => ({ id: 'tpl-1' })),
    };

    const service = new OperationalExpensesService(
      ((deps.repository as typeof repository) ?? repository) as any,
      ((deps.multimediaService as typeof multimediaService) ?? multimediaService) as any,
      ((deps.supplierFiscalDocumentCreate as typeof supplierFiscalDocumentCreate) ??
        supplierFiscalDocumentCreate) as any,
      ((deps.operatingExpensePaymentPlan as typeof operatingExpensePaymentPlan) ??
        operatingExpensePaymentPlan) as any,
      ((deps.branchRepo as typeof branchRepo) ?? branchRepo) as any,
      ((deps.transactionRepo as typeof transactionRepo) ?? transactionRepo) as any,
      ((deps.recurringTemplates as typeof recurringTemplates) ??
        recurringTemplates) as any,
    );

    return {
      service,
      repository,
      supplierFiscalDocumentCreate,
      operatingExpensePaymentPlan,
      recurringTemplates,
    };
  }

  it('crea OE aprobado con factura fiscal y paymentStatus', async () => {
    const { service, supplierFiscalDocumentCreate, repository } = buildService();
    await service.create(baseDto as any);
    expect(supplierFiscalDocumentCreate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'SUPPLIER_INVOICE',
        dteNumber: 'F-100',
      }),
    );
    expect(repository.update).toHaveBeenCalledWith(
      'oe-1',
      expect.objectContaining({
        supplierFiscalDocumentTransactionId: 'fiscal-1',
        paymentStatus: PaymentStatus.PENDING,
      }),
    );
  });

  it('crea OE tipo OTHER con plan de pago operativo', async () => {
    const { service, operatingExpensePaymentPlan } = buildService();
    await service.create({
      ...baseDto,
      documentKind: OperationalExpenseDocumentKind.OTHER,
      supplierDocumentPayment: {
        mode: 'PENDING_SCHEDULED',
        paidLines: [],
        scheduledLines: [{ dueDate: '2026-07-01', amount: 11900 }],
      },
    } as any);
    expect(operatingExpensePaymentPlan.createWithPaymentPlan).toHaveBeenCalled();
  });

  it('hace rollback del OE si falla la creación fiscal', async () => {
    const { service, repository, supplierFiscalDocumentCreate } = buildService();
    supplierFiscalDocumentCreate.create.mockRejectedValue(
      new BadRequestException('folio duplicado'),
    );
    await expect(service.create(baseDto as any)).rejects.toThrow('folio duplicado');
    expect(repository.remove).toHaveBeenCalledWith('oe-1');
  });
});
