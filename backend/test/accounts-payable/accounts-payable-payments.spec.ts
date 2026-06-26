/**
 * Accounts payable list is driven by DRAFT payment transactions
 * (SUPPLIER_PAYMENT, PAYROLL_PAYMENT, EXPENSE_PAYMENT), not installments.
 */
import { AccountsPayableService } from '@modules/transactions/application/services/accounts-payable.service';
import {
  TransactionStatus,
  TransactionType,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';

describe('AccountsPayableService (unit)', () => {
  const mockQb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockTxRepo = {
    createQueryBuilder: jest.fn(() => mockQb),
    find: jest.fn(),
  };

  const service = new AccountsPayableService(mockTxRepo as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps DRAFT SUPPLIER_PAYMENT rows for AP list', async () => {
    const payment = {
      id: 'pay-1',
      transactionType: TransactionType.SUPPLIER_PAYMENT,
      documentNumber: 'PAGO-001',
      relatedTransactionId: 'inv-1',
      status: TransactionStatus.DRAFT,
      paymentStatus: PaymentStatus.PENDING,
      total: 100000,
      amountPaid: 0,
      paymentDueDate: new Date('2026-06-01'),
      createdAt: new Date(),
      metadata: { installmentNumber: 1, totalInstallments: 2 },
      supplier: {
        alias: 'Proveedor Test',
        person: null,
      },
    };

    mockQb.getMany.mockResolvedValue([payment]);
    mockTxRepo.find.mockResolvedValue([
      {
        id: 'inv-1',
        documentNumber: 'FAC-100',
        transactionType: TransactionType.SUPPLIER_INVOICE,
      },
    ]);

    const rows = await service.list();

    expect(rows).toHaveLength(1);
    expect(rows[0].paymentType).toBe('SUPPLIER_PAYMENT');
    expect(rows[0].originCategory).toBe('PURCHASE');
    expect(rows[0].pendingAmount).toBe(100000);
    expect(rows[0].parentDocumentNumber).toBe('FAC-100');
    expect(rows[0].installmentNumber).toBe(1);
    expect(rows[0].sourceType).toBe('PURCHASE');
  });

  it('maps SUPPLIER_PAYMENT with operational expense parent as OPERATING_EXPENSE', async () => {
    const payment = {
      id: 'pay-oe',
      transactionType: TransactionType.SUPPLIER_PAYMENT,
      documentNumber: 'PAGO-OE-1',
      relatedTransactionId: 'dte-1',
      status: TransactionStatus.DRAFT,
      paymentStatus: PaymentStatus.PENDING,
      total: 90000,
      amountPaid: 0,
      paymentDueDate: new Date('2026-06-24'),
      createdAt: new Date(),
      metadata: { installmentNumber: 1, totalInstallments: 1 },
      supplier: { alias: 'Peajes', person: null },
    };

    mockQb.getMany.mockResolvedValue([payment]);
    mockTxRepo.find.mockResolvedValue([
      {
        id: 'dte-1',
        documentNumber: '098098',
        transactionType: TransactionType.SUPPLIER_RECEIPT,
        metadata: { links: { operationalExpenseId: 'oe-1' } },
      },
    ]);

    const rows = await service.list();
    expect(rows[0].originCategory).toBe('OPERATING_EXPENSE');
    expect(rows[0].sourceType).toBe('OPERATING_EXPENSE');
  });
});
