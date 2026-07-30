import { InstallmentSourceType, InstallmentStatus } from '@modules/installments/domain/installment.entity';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { InstallmentService } from '../../application/services/installment.service';

describe('InstallmentService.createFromTransactionMetadata', () => {
  function buildService() {
    const repo = {
      getInstallmentsByTransaction: jest.fn().mockResolvedValue([]),
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => ({ id: `inst-${row.installmentNumber}`, ...row })),
    };
    const service = Object.create(InstallmentService.prototype) as InstallmentService;
    Object.assign(service, {
      repo,
      createInstallmentsFromSchedule: jest.fn(),
      createInstallmentsForTransaction: jest.fn(),
    });
    return { service, repo };
  }

  it('returns empty when metadata has no installment plan', async () => {
    const { service } = buildService();
    const result = await service.createFromTransactionMetadata(
      {
        id: 'sale-1',
        total: 10000,
        customerId: 'cust-1',
        supplierId: undefined,
        transactionType: TransactionType.SALE,
        metadata: {},
      },
      'company-1',
    );
    expect(result).toEqual([]);
  });

  it('creates installments from paymentSchedule for SALE', async () => {
    const { service } = buildService();
    const scheduleResult = [{ id: 'inst-1' }];
    (service as any).createInstallmentsFromSchedule.mockResolvedValue(scheduleResult);

    const result = await service.createFromTransactionMetadata(
      {
        id: 'sale-1',
        total: 43001,
        customerId: 'cust-1',
        supplierId: undefined,
        transactionType: TransactionType.SALE,
        metadata: {
          numberOfInstallments: 2,
          firstDueDate: '2026-07-05',
          paymentSchedule: [
            { installmentNumber: 1, dueDate: '2026-07-05', amount: 21501 },
            { installmentNumber: 2, dueDate: '2026-08-05', amount: 21500 },
          ],
        },
      },
      'company-1',
    );

    expect((service as any).createInstallmentsFromSchedule).toHaveBeenCalledWith(
      'sale-1',
      [
        { amount: 21501, dueDate: '2026-07-05' },
        { amount: 21500, dueDate: '2026-08-05' },
      ],
      {
        sourceType: InstallmentSourceType.SALE,
        payeeType: 'CUSTOMER',
        payeeId: 'cust-1',
        companyId: 'company-1',
      },
    );
    expect(result).toBe(scheduleResult);
  });

  it('reuses existing installments for idempotency', async () => {
    const { service, repo } = buildService();
    const existing = [
      {
        id: 'inst-existing',
        status: InstallmentStatus.PENDING,
        sourceType: InstallmentSourceType.SALE,
      },
    ];
    repo.getInstallmentsByTransaction.mockResolvedValue(existing);

    const result = await service.createFromTransactionMetadata(
      {
        id: 'sale-1',
        total: 43001,
        customerId: 'cust-1',
        supplierId: undefined,
        transactionType: TransactionType.SALE,
        metadata: {
          numberOfInstallments: 2,
          firstDueDate: '2026-07-05',
        },
      },
      'company-1',
    );

    expect(result).toBe(existing);
    expect((service as any).createInstallmentsForTransaction).not.toHaveBeenCalled();
  });
});
