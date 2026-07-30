import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConvertQuotationUseCase } from '@modules/quotations/application/commands/convert-quotation.usecase';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { CreateTransactionCommand } from '@modules/transactions/application/commands/create-transaction.usecase';

describe('ConvertQuotationUseCase', () => {
  const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
  const USER_ID = '00000000-0000-0000-0000-0000000000aa';

  let txRepo: { findOne: jest.Mock; save: jest.Mock };
  let lineRepo: { find: jest.Mock };
  let commandBus: { execute: jest.Mock };
  let usecase: ConvertQuotationUseCase;

  const baseQuotation = (overrides: Partial<Transaction> = {}): Transaction =>
    ({
      id: 'q-1',
      companyId: COMPANY_ID,
      documentNumber: 'COT2600001',
      transactionType: TransactionType.QUOTATION,
      status: TransactionStatus.CONFIRMED,
      branchId: 'br-1',
      pointOfSaleId: null,
      customerId: 'c-1',
      subtotal: 1000,
      taxAmount: 190,
      discountAmount: 0,
      total: 1190,
      notes: 'demo',
      metadata: {
        quotation: {
          issuedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 86400000).toISOString(),
          validityDays: 1,
          currency: 'CLP',
        },
      },
      ...overrides,
    }) as Transaction;

  const baseLine = (overrides: Partial<TransactionLine> = {}): TransactionLine =>
    ({
      id: 'l-1',
      transactionId: 'q-1',
      lineNumber: 1,
      productId: 'p-1',
      productVariantId: 'v-1',
      productName: 'Producto X',
      productSku: 'SKU-X',
      variantName: null,
      quantity: 1,
      unitPrice: 1000,
      discountPercentage: 0,
      discountAmount: 0,
      taxRate: 19,
      taxAmount: 190,
      subtotal: 1000,
      total: 1190,
      ...overrides,
    }) as TransactionLine;

  beforeEach(() => {
    txRepo = { findOne: jest.fn(), save: jest.fn().mockImplementation((t) => t) };
    lineRepo = { find: jest.fn() };
    commandBus = {
      execute: jest.fn().mockResolvedValue({
        id: 'sale-1',
        documentNumber: 'VTA2600010',
      } as Partial<Transaction>),
    };
    usecase = new ConvertQuotationUseCase(
      txRepo as any,
      lineRepo as any,
      commandBus as any,
    );
  });

  it('throws NotFoundException when quotation does not exist', async () => {
    txRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      usecase.execute(COMPANY_ID, USER_ID, 'missing', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects already-converted quotations', async () => {
    txRepo.findOne.mockResolvedValueOnce(
      baseQuotation({ status: TransactionStatus.COMPLETED }),
    );
    await expect(
      usecase.execute(COMPANY_ID, USER_ID, 'q-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cancelled quotations', async () => {
    txRepo.findOne.mockResolvedValueOnce(
      baseQuotation({ status: TransactionStatus.CANCELLED }),
    );
    await expect(
      usecase.execute(COMPANY_ID, USER_ID, 'q-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported target types', async () => {
    txRepo.findOne.mockResolvedValueOnce(baseQuotation());
    await expect(
      usecase.execute(COMPANY_ID, USER_ID, 'q-1', {
        targetType: TransactionType.PURCHASE as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks conversion when quotation is expired', async () => {
    const expired = baseQuotation({
      metadata: {
        quotation: {
          issuedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() - 86400000).toISOString(),
        },
      },
    });
    txRepo.findOne.mockResolvedValueOnce(expired);
    await expect(
      usecase.execute(COMPANY_ID, USER_ID, 'q-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes line snapshots verbatim (price respected) and links bidirectionally', async () => {
    const quotation = baseQuotation();
    const line = baseLine();
    txRepo.findOne.mockResolvedValueOnce(quotation);
    lineRepo.find.mockResolvedValueOnce([line]);

    const result = await usecase.execute(COMPANY_ID, USER_ID, 'q-1', {});

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const command: CreateTransactionCommand = commandBus.execute.mock.calls[0][0];
    expect(command).toBeInstanceOf(CreateTransactionCommand);
    expect(command.dto.transactionType).toBe(TransactionType.SALE);
    expect(command.dto.subtotal).toBe(quotation.subtotal);
    expect(command.dto.total).toBe(quotation.total);
    expect(command.dto.lines?.length).toBe(1);
    const out = command.dto.lines![0];
    expect(out.unitPrice).toBe(line.unitPrice);
    expect(out.subtotal).toBe(line.subtotal);
    expect(out.total).toBe(line.total);
    expect(out.taxRate).toBe(line.taxRate);
    expect(command.dto.metadata?.links?.quotationId).toBe(quotation.id);
    expect(command.dto.metadata?.links?.quotationDocumentNumber).toBe(
      quotation.documentNumber,
    );

    expect(txRepo.save).toHaveBeenCalledTimes(1);
    const updated = txRepo.save.mock.calls[0][0];
    expect(updated.status).toBe(TransactionStatus.COMPLETED);
    expect(updated.metadata.quotation.convertedToTransactionId).toBe('sale-1');
    expect(updated.metadata.quotation.convertedToDocumentNumber).toBe(
      'VTA2600010',
    );

    expect(result).toEqual(
      expect.objectContaining({
        quotationId: quotation.id,
        targetTransactionId: 'sale-1',
        targetTransactionDocumentNumber: 'VTA2600010',
        expiredAtConversion: false,
        pricesRefreshed: false,
      }),
    );
  });

  it('supports targetType=CUSTOMER_ORDER', async () => {
    const quotation = baseQuotation();
    const line = baseLine();
    txRepo.findOne.mockResolvedValueOnce(quotation);
    lineRepo.find.mockResolvedValueOnce([line]);

    await usecase.execute(COMPANY_ID, USER_ID, 'q-1', {
      targetType: TransactionType.CUSTOMER_ORDER,
    });
    const command: CreateTransactionCommand = commandBus.execute.mock.calls[0][0];
    expect(command.dto.transactionType).toBe(TransactionType.CUSTOMER_ORDER);
  });
});
