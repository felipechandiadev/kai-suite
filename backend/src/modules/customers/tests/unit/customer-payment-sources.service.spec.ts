import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import { CustomerPaymentSourcesService } from '../../application/customer-payment-sources.service';

describe('CustomerPaymentSourcesService', () => {
  const txRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const service = new CustomerPaymentSourcesService(txRepo as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists credit notes and backorders with available balance', async () => {
    txRepo.find.mockImplementation(async (opts: { where: { transactionType: string } }) => {
      if (opts.where.transactionType === 'CUSTOMER_CREDIT_NOTE') {
        return [
          {
            id: 'nc-1',
            documentNumber: 'NC-100',
            total: 5000,
            metadata: { creditNote: { consumedAmount: 2000 } },
            createdAt: new Date('2026-01-01'),
          },
          {
            id: 'nc-2',
            documentNumber: 'NC-101',
            total: 1000,
            metadata: { creditNote: { consumedAmount: 1000 } },
            createdAt: new Date('2026-01-02'),
          },
        ];
      }
      return [
        {
          id: 'bo-1',
          documentNumber: 'ECG50',
          total: 3000,
          metadata: {
            backorder: {
              reservationStatus: 'OPEN',
              depositAmount: 3000,
              depositConsumedAmount: 500,
            },
          },
          createdAt: new Date('2026-01-03'),
        },
      ];
    });

    const result = await service.listForCustomer('cust-1');
    expect(result.creditNotes).toHaveLength(1);
    expect(result.creditNotes[0]).toMatchObject({
      id: 'nc-1',
      documentNumber: 'NC-100',
      availableAmount: 3000,
    });
    expect(result.orderAdvances).toHaveLength(1);
    expect(result.orderAdvances[0].availableAmount).toBe(2500);
  });

  it('rejects payment above credit note available', async () => {
    jest.spyOn(service, 'listForCustomer').mockResolvedValue({
      creditNotes: [
        {
          id: 'nc-1',
          documentNumber: 'NC-100',
          total: 5000,
          consumedAmount: 0,
          availableAmount: 3000,
          createdAt: '',
        },
      ],
      orderAdvances: [],
    });

    await expect(
      service.validatePaymentsForCustomer('cust-1', [
        {
          paymentMethod: PaymentMethod.CUSTOMER_CREDIT_NOTE,
          amount: 4000,
          creditNoteTransactionId: 'nc-1',
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('consumes credit note balance on apply', async () => {
    const tx = {
      id: 'nc-1',
      customerId: 'cust-1',
      transactionType: 'CUSTOMER_CREDIT_NOTE',
      total: 5000,
      metadata: {},
    };
    txRepo.findOne.mockResolvedValue(tx);
    txRepo.save.mockImplementation(async (row) => row);

    jest.spyOn(service, 'listForCustomer').mockResolvedValue({
      creditNotes: [
        {
          id: 'nc-1',
          documentNumber: 'NC-100',
          total: 5000,
          consumedAmount: 0,
          availableAmount: 5000,
          createdAt: '',
        },
      ],
      orderAdvances: [],
    });

    await service.applyPaymentsToSources(
      'cust-1',
      [
        {
          paymentMethod: PaymentMethod.CUSTOMER_CREDIT_NOTE,
          amount: 2000,
          creditNoteTransactionId: 'nc-1',
        },
      ],
      'sale-1',
    );

    expect(txRepo.save).toHaveBeenCalled();
    const saved = txRepo.save.mock.calls[0][0];
    expect(saved.metadata.creditNote.consumedAmount).toBe(2000);
    expect(saved.metadata.creditNote.applications).toHaveLength(1);
  });
});
