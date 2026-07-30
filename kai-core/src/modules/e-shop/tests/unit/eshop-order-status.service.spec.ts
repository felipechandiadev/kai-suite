import { BadRequestException } from '@nestjs/common';
import { EShopOrderStatusService } from '../../application/eshop-order-status.service';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

describe('EShopOrderStatusService.updateStatus', () => {
  const txRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const svc = new EShopOrderStatusService(txRepo as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid transition', async () => {
    txRepo.findOne.mockResolvedValue({
      id: 't1',
      companyId: 'c1',
      transactionType: TransactionType.CUSTOMER_ORDER,
      metadata: {
        source: 'e-shop',
        eShopOrder: {
          fulfillmentStatus: 'SUBMITTED',
          statusHistory: [],
        },
      },
    });
    await expect(
      svc.updateStatus('c1', 't1', 'DELIVERED'),
    ).rejects.toThrow(BadRequestException);
  });
});
