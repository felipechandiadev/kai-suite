import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VoidSaleService } from '../../application/void-sale.service';
import {
  PaymentMethod,
  PaymentStatus,
  TransactionStatus,
  TransactionType,
} from '../../domain/transaction.entity';

describe('VoidSaleService', () => {
  const companyId = 'co-1';
  const userId = 'user-1';
  const saleId = 'sale-1';

  function buildSale(overrides?: Record<string, unknown>) {
    return {
      id: saleId,
      companyId,
      branchId: 'branch-1',
      userId,
      transactionType: TransactionType.SALE,
      status: TransactionStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      documentType: 'TICKET',
      documentNumber: 'V-1',
      storageId: 'storage-1',
      customerId: 'cust-1',
      cashSessionId: null,
      subtotal: 1000,
      taxAmount: 0,
      discountAmount: 0,
      total: 1000,
      paymentMethod: PaymentMethod.CASH,
      amountPaid: 1000,
      createdAt: new Date('2026-07-01T12:00:00.000Z'),
      metadata: {},
      notes: null,
      lines: [
        {
          productId: 'prod-1',
          productVariantId: 'var-1',
          productName: 'Producto',
          productSku: 'SKU-1',
          quantity: 1,
          quantityInBase: 1,
          unitPrice: 1000,
          unitCost: 400,
          taxRate: 0,
          taxAmount: 0,
          discountAmount: 0,
          discountPercentage: 0,
        },
      ],
      ...overrides,
    };
  }

  function buildService(opts?: {
    sale?: Record<string, unknown> | null;
    returnCount?: number;
  }) {
    const sale = opts?.sale === undefined ? buildSale() : opts.sale;
    const txRepo = {
      findOne: jest.fn().mockResolvedValue(sale),
      count: jest.fn().mockResolvedValue(opts?.returnCount ?? 0),
      create: jest.fn((data: Record<string, unknown>) => ({
        id: 'void-adj-1',
        ...data,
      })),
      save: jest.fn(async (entity: Record<string, unknown>) => ({
        id: entity.id ?? 'void-adj-1',
        ...entity,
      })),
    };

    const installmentRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => {
        const name = entity?.name ?? '';
        if (name === 'Installment' || String(entity).includes('Installment')) {
          return installmentRepo;
        }
        return {
          findOne: jest.fn().mockResolvedValue(sale ? { ...sale } : null),
          find: jest.fn().mockResolvedValue([]),
          save: jest.fn().mockResolvedValue(undefined),
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
          })),
        };
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };

    const dataSource = {
      transaction: jest.fn(async (fn: (m: typeof manager) => Promise<void>) => {
        await fn(manager);
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    const transactionsService = {
      createTransaction: jest.fn().mockResolvedValue({
        id: 'stock-adj-1',
        documentNumber: 'AIN-1',
      }),
    };

    const documentNumbers = {
      allocateNext: jest.fn().mockResolvedValue('VOID-1'),
    };

    const service = new VoidSaleService(
      txRepo as any,
      dataSource as any,
      transactionsService as any,
      documentNumbers as any,
    );

    return {
      service,
      txRepo,
      dataSource,
      transactionsService,
      documentNumbers,
      manager,
      installmentRepo,
    };
  }

  it('voids a non-fiscal sale (happy path)', async () => {
    const { service, transactionsService, documentNumbers } = buildService();

    const result = await service.void(companyId, userId, saleId, {
      reason: 'Error de cobro',
    });

    expect(transactionsService.createTransaction).toHaveBeenCalledTimes(1);
    expect(documentNumbers.allocateNext).toHaveBeenCalled();
    expect(result.sale.status).toBe(TransactionStatus.VOIDED);
    expect(result.stockAdjustmentId).toBe('stock-adj-1');
    expect(result.voidAdjustmentId).toBe('void-adj-1');
  });

  it('blocks fiscal DTE (boleta/factura)', async () => {
    const { service, transactionsService } = buildService({
      sale: buildSale({ documentType: 'BOLETA' }),
    });

    await expect(
      service.void(companyId, userId, saleId, { reason: 'Motivo válido' }),
    ).rejects.toThrow(BadRequestException);
    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
  });

  it('blocks when SALE_RETURN exists', async () => {
    const { service, transactionsService } = buildService({
      returnCount: 1,
    });

    await expect(
      service.void(companyId, userId, saleId, { reason: 'Motivo válido' }),
    ).rejects.toThrow(BadRequestException);
    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
  });

  it('blocks when already VOIDED', async () => {
    const { service, transactionsService } = buildService({
      sale: buildSale({ status: TransactionStatus.VOIDED }),
    });

    await expect(
      service.void(companyId, userId, saleId, { reason: 'Motivo válido' }),
    ).rejects.toThrow(BadRequestException);
    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
  });

  it('throws when sale not found', async () => {
    const { service } = buildService({ sale: null });

    await expect(
      service.void(companyId, userId, saleId, { reason: 'Motivo válido' }),
    ).rejects.toThrow(NotFoundException);
  });
});
