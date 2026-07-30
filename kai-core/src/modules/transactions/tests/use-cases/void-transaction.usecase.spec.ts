import {
  VoidTransactionUseCase,
  VoidTransactionCommand,
} from '../../application/use-cases/void-transaction.usecase';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../domain/transaction.entity';

describe('VoidTransactionUseCase', () => {
  let useCase: VoidTransactionUseCase;
  let mockTransactionRepo: { findById: jest.Mock; save: jest.Mock };
  let mockCacheService: {
    invalidateTransactionDetails: jest.Mock;
    invalidateCustomerCache: jest.Mock;
    invalidateTransactionSummary: jest.Mock;
    invalidateDailySales: jest.Mock;
  };
  let mockDataSource: { query: jest.Mock };

  beforeEach(() => {
    mockTransactionRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    mockCacheService = {
      invalidateTransactionDetails: jest.fn().mockResolvedValue(undefined),
      invalidateCustomerCache: jest.fn().mockResolvedValue(undefined),
      invalidateTransactionSummary: jest.fn().mockResolvedValue(undefined),
      invalidateDailySales: jest.fn().mockResolvedValue(undefined),
    };
    mockDataSource = { query: jest.fn().mockResolvedValue([]) };

    useCase = new VoidTransactionUseCase(
      mockTransactionRepo as any,
      mockCacheService as any,
      mockDataSource as any,
    );
  });

  it('should create VOID_ADJUSTMENT for a valid transaction', async () => {
    const originalTransaction = {
      id: 'original-id',
      companyId: 'company-1',
      transactionType: TransactionType.SALE,
      status: TransactionStatus.CONFIRMED,
      branchId: 'branch-1',
      userId: 'user-1',
      subtotal: 1000,
      taxAmount: 190,
      discountAmount: 0,
      total: 1190,
      documentNumber: 'SALE-001',
      createdAt: new Date(),
      paymentMethod: 'CASH' as any,
      amountPaid: 1190,
      lines: [],
      metadata: { someData: 'value' },
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(originalTransaction);
    mockTransactionRepo.save.mockResolvedValue({} as Transaction);

    const command = new VoidTransactionCommand(
      'original-id',
      'Cliente solicitó devolución',
      'admin-user',
      'Anulación por solicitud del cliente',
    );

    const result = await useCase.execute(command);

    expect(mockTransactionRepo.save).toHaveBeenCalledTimes(2); // Original + void
    expect(result.transactionType).toBe(TransactionType.VOID_ADJUSTMENT);
    expect(result.relatedTransactionId).toBe('original-id');
    expect(result.total).toBe(-1190); // Monto negativo
    expect(result.metadata?.voidReason).toBe('Cliente solicitó devolución');
    expect(result.metadata?.voidApprovedBy).toBe('admin-user');
  });

  it('should throw error for non-existent transaction', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);

    const command = new VoidTransactionCommand('invalid-id', 'Test', 'admin');

    await expect(useCase.execute(command)).rejects.toThrow(
      'Transacción invalid-id no encontrada',
    );
  });

  it('should throw error for already cancelled transaction', async () => {
    const cancelledTransaction = {
      id: 'cancelled-id',
      status: TransactionStatus.CANCELLED,
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(cancelledTransaction);

    const command = new VoidTransactionCommand('cancelled-id', 'Test', 'admin');

    await expect(useCase.execute(command)).rejects.toThrow(
      'La transacción ya está anulada',
    );
  });

  it('should revert promotion redemptions and uses_count on void', async () => {
    const originalTransaction = {
      id: 'sale-with-promo',
      companyId: 'company-1',
      transactionType: TransactionType.SALE,
      status: TransactionStatus.CONFIRMED,
      branchId: 'branch-1',
      userId: 'user-1',
      subtotal: 2000,
      taxAmount: 380,
      discountAmount: 200,
      total: 2180,
      documentNumber: 'SALE-100',
      createdAt: new Date(),
      paymentMethod: 'CASH' as any,
      amountPaid: 2180,
      lines: [],
      metadata: {},
      customerId: 'customer-1',
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(originalTransaction);
    mockTransactionRepo.save.mockResolvedValue({} as Transaction);

    mockDataSource.query.mockImplementation((sql: string) => {
      if (/SELECT[\s\S]+FROM promotion_redemptions/i.test(sql)) {
        return Promise.resolve([
          {
            id: 'red-1',
            company_id: 'company-1',
            promotion_id: 'promo-1',
            customer_id: 'customer-1',
            amount_discounted: '200',
            snapshot: { promotionCode: 'NAVIDAD10' },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const command = new VoidTransactionCommand(
      'sale-with-promo',
      'Reverso solicitado por cliente',
      'admin-user',
    );
    await useCase.execute(command);

    const insertCall = mockDataSource.query.mock.calls.find((c: any[]) =>
      /INSERT INTO promotion_redemptions/i.test(c[0]),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![1]).toEqual(
      expect.arrayContaining([
        'company-1',
        'promo-1',
        expect.any(String),
        'customer-1',
        -200,
        expect.objectContaining({
          reversal: true,
          reversalReason: 'Reverso solicitado por cliente',
        }),
      ]),
    );

    const updateCall = mockDataSource.query.mock.calls.find((c: any[]) =>
      /UPDATE promotions[\s\S]+uses_count = GREATEST/i.test(c[0]),
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toEqual(['promo-1']);
  });

  it('should throw error for non-voidable transaction types', async () => {
    const voidTransaction = {
      id: 'void-id',
      transactionType: TransactionType.VOID_ADJUSTMENT,
      status: TransactionStatus.CONFIRMED,
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(voidTransaction);

    const command = new VoidTransactionCommand('void-id', 'Test', 'admin');

    await expect(useCase.execute(command)).rejects.toThrow(
      'Tipo de transacción VOID_ADJUSTMENT no se puede anular',
    );
  });
});
