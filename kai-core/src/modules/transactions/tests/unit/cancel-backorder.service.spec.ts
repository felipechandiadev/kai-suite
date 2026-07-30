import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CancelBackorderService } from '../../application/cancel-backorder.service';
import { TransactionType } from '../../domain/transaction.entity';

describe('CancelBackorderService', () => {
  const companyId = 'co-1';
  const userId = 'user-1';
  const backorderId = 'bo-1';

  function buildService(overrides?: {
    backorder?: Record<string, unknown> | null;
    reservation?: Record<string, unknown> | null;
  }) {
    const backorder = overrides?.backorder ?? {
      id: backorderId,
      companyId,
      transactionType: TransactionType.BACKORDER,
      customerId: 'cust-1',
      branchId: 'branch-1',
      documentNumber: 'ENCARGO-1',
      amountPaid: 5000,
      metadata: {
        backorder: {
          reservationStatus: 'OPEN',
          depositAmount: 5000,
          depositConsumedAmount: 0,
        },
      },
      lines: [
        {
          productVariantId: 'var-1',
          quantity: 1,
          quantityInBase: 1,
        },
      ],
    };

    const txRepo = {
      findOne: jest.fn().mockResolvedValue(backorder),
    };

    const stockCommitment = {
      release: jest.fn().mockResolvedValue(undefined),
    };

    const transactionsService = {
      createTransaction: jest.fn().mockResolvedValue({
        id: 'nc-1',
        documentNumber: 'NCC-1',
        total: 5000,
      }),
    };

    const manager = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(backorder)
          .mockResolvedValue({
            companyId,
            transactionType: TransactionType.INVENTORY_RESERVATION,
            storageId: 'storage-1',
            lines: [{ productVariantId: 'var-1', quantity: 1, quantityInBase: 1 }],
          }),
        save: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const dataSource = {
      transaction: jest.fn(async (fn: (m: typeof manager) => Promise<void>) => {
        await fn(manager);
      }),
    };

    const service = new CancelBackorderService(
      txRepo as any,
      dataSource as any,
      stockCommitment as any,
      transactionsService as any,
    );

    return {
      service,
      txRepo,
      stockCommitment,
      transactionsService,
      manager,
    };
  }

  it('rejects fulfilled backorders', async () => {
    const { service } = buildService({
      backorder: {
        id: backorderId,
        companyId,
        transactionType: TransactionType.BACKORDER,
        customerId: 'cust-1',
        metadata: {
          backorder: { reservationStatus: 'FULFILLED', depositAmount: 1000 },
        },
        lines: [],
      },
    });

    await expect(
      service.cancel(companyId, userId, backorderId, {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates credit note when deposit available', async () => {
    const { service, transactionsService, stockCommitment } = buildService();

    const result = await service.cancel(companyId, userId, backorderId, {
      reason: 'Cliente desistió',
    });

    expect(transactionsService.createTransaction).toHaveBeenCalledTimes(1);
    const ncDto = transactionsService.createTransaction.mock.calls[0][0];
    expect(ncDto.metadata.links.backorderId).toBe(backorderId);
    expect(ncDto.total).toBe(5000);
    expect(stockCommitment.release).toHaveBeenCalled();
    expect(result.creditNote?.id).toBe('nc-1');
    expect(result.refundedAmount).toBe(5000);
  });

  it('skips credit note when no deposit', async () => {
    const { service, transactionsService } = buildService({
      backorder: {
        id: backorderId,
        companyId,
        transactionType: TransactionType.BACKORDER,
        customerId: 'cust-1',
        branchId: 'branch-1',
        documentNumber: 'ENCARGO-2',
        amountPaid: 0,
        metadata: {
          backorder: {
            reservationStatus: 'OPEN',
            depositAmount: 0,
            depositConsumedAmount: 0,
          },
        },
        lines: [
          { productVariantId: 'var-1', quantity: 1, quantityInBase: 1 },
        ],
      },
    });

    const result = await service.cancel(companyId, userId, backorderId, {});

    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    expect(result.creditNote).toBeNull();
    expect(result.refundedAmount).toBe(0);
  });

  it('throws when backorder not found', async () => {
    const { service, txRepo } = buildService();
    txRepo.findOne.mockResolvedValue(null);

    await expect(
      service.cancel(companyId, userId, backorderId, {}),
    ).rejects.toThrow(NotFoundException);
  });
});
