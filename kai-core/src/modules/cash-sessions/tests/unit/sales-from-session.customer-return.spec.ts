import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesFromSessionService } from '../../application/sales-from-session.service';
import { TransactionType } from '../../../transactions/domain/transaction.entity';

describe('SalesFromSessionService — confirmCustomerReturnWithCreditNote', () => {
  const originalSaleId = 'sale-1';
  const saleReturnId = 'return-1';
  const creditNoteId = 'nc-1';

  function buildService() {
    const transactionRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    const pointOfSaleRepository = { findOne: jest.fn() };
    const userRepository = { findOne: jest.fn() };
    const transactionsService = {
      createTransaction: jest.fn(),
    };

    const service = Object.create(SalesFromSessionService.prototype) as SalesFromSessionService;
    Object.assign(service, {
      transactionRepository,
      pointOfSaleRepository,
      userRepository,
      transactionsService,
      createSaleReturn: jest.fn(),
    });

    return {
      service,
      transactionRepository,
      pointOfSaleRepository,
      userRepository,
      transactionsService,
    };
  }

  const baseDto = {
    originalSaleId,
    customerId: 'cust-1',
    pointOfSaleId: 'pos-1',
    cashSessionId: 'session-1',
    userName: 'cashier',
    paymentMethod: 'CASH' as const,
    amountPaid: 0,
    changeAmount: 0,
    lines: [{ productVariantId: 'var-1', quantity: 1, unitPrice: 1000 }],
  };

  it('throws when original sale is missing', async () => {
    const { service, transactionRepository } = buildService();
    transactionRepository.findOne.mockResolvedValue(null);

    await expect(service.confirmCustomerReturnWithCreditNote(baseDto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('creates SALE_RETURN then CUSTOMER_CREDIT_NOTE with links', async () => {
    const {
      service,
      transactionRepository,
      pointOfSaleRepository,
      userRepository,
      transactionsService,
    } = buildService();

    const originalSale = {
      id: originalSaleId,
      documentNumber: 'VTA-01',
      transactionType: TransactionType.SALE,
    };
    const saleReturnTx = {
      id: saleReturnId,
      documentNumber: 'DEV-01',
      subtotal: 840,
      taxAmount: 160,
      discountAmount: 0,
      total: 1000,
    };

    transactionRepository.findOne.mockResolvedValue(originalSale);
    (service as any).createSaleReturn.mockResolvedValue({
      transaction: saleReturnTx,
      lines: [],
    });
    pointOfSaleRepository.findOne.mockResolvedValue({ id: 'pos-1', branchId: 'branch-1' });
    userRepository.findOne.mockResolvedValue({ id: 'user-1' });
    transactionsService.createTransaction.mockResolvedValue({
      id: creditNoteId,
      documentNumber: 'NCC-01',
      total: 1000,
    });

    const result = await service.confirmCustomerReturnWithCreditNote(baseDto);

    expect((service as any).createSaleReturn).toHaveBeenCalledWith(baseDto, {
      immediateRefund: false,
    });
    expect(transactionsService.createTransaction).toHaveBeenCalledTimes(1);
    const ncDto = transactionsService.createTransaction.mock.calls[0][0];
    expect(ncDto.transactionType).toBe(TransactionType.CUSTOMER_CREDIT_NOTE);
    expect(ncDto.relatedTransactionId).toBe(saleReturnId);
    expect(ncDto.metadata.links.saleReturnId).toBe(saleReturnId);
    expect(ncDto.metadata.links.saleId).toBe(originalSaleId);
    expect(ncDto.lines).toEqual([]);

    expect(result.success).toBe(true);
    expect(result.saleReturn.id).toBe(saleReturnId);
    expect(result.creditNote.id).toBe(creditNoteId);
    expect(result.originalSale.documentNumber).toBe('VTA-01');
  });

  it('propagates validation errors from createSaleReturn', async () => {
    const { service, transactionRepository } = buildService();
    transactionRepository.findOne.mockResolvedValue({
      id: originalSaleId,
      documentNumber: 'VTA-01',
    });
    (service as any).createSaleReturn.mockRejectedValue(
      new BadRequestException('Cantidad a devolver excede lo vendido'),
    );

    await expect(service.confirmCustomerReturnWithCreditNote(baseDto)).rejects.toThrow(
      BadRequestException,
    );
  });
});
