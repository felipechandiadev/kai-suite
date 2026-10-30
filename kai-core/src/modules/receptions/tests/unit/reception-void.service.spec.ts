import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReceptionVoidService } from '../../application/reception-void.service';
import { ReceptionStatus } from '../../domain/reception.entity';
import {
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';

describe('ReceptionVoidService', () => {
  const companyId = 'co-1';
  const userId = 'user-1';
  const receptionId = 'rec-1';

  function build(opts?: {
    reception?: Record<string, unknown> | null;
    payments?: Array<Record<string, unknown>>;
    returnCount?: number;
    stock?: number;
    pmp?: Record<string, unknown>;
    failTransaction?: boolean;
  }) {
    const reception =
      opts?.reception === undefined
        ? {
            id: receptionId,
            companyId,
            status: ReceptionStatus.ACTIVE,
            transactionId: 'pur-1',
            branchId: 'br-1',
            documentNumber: 'CMP-1',
          }
        : opts.reception;
    const purchase = {
      id: 'pur-1',
      companyId,
      branchId: 'br-1',
      storageId: 'st-1',
      supplierId: 'sup-1',
      transactionType: TransactionType.PURCHASE,
      status: TransactionStatus.CONFIRMED,
      subtotal: 1000,
      taxAmount: 0,
      discountAmount: 0,
      total: 1000,
      documentNumber: 'CMP-1',
      notes: null,
      metadata: {},
      lines: [
        {
          productId: 'p-1',
          productVariantId: 'var-1',
          productName: 'Producto',
          quantity: 10,
          quantityInBase: 10,
          unitPrice: 100,
          unitCost: 100,
        },
      ],
    };
    const variant = {
      id: 'var-1',
      name: 'Var',
      pmp: 100,
      pmpHistory: [
        {
          at: '2026-01-01T00:00:00.000Z',
          previousPmp: 80,
          newPmp: 100,
          source: 'transaction_cost',
          transactionId: 'pur-1',
        },
      ],
      ...(opts?.pmp ?? {}),
    };
    const savedVariants: any[] = [];
    const savedTx: any[] = [];
    const savedReception: any[] = [];
    const payments = opts?.payments ?? [];

    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(opts?.returnCount ?? 0),
    };
    const txRepo = {
      findOne: jest.fn(async ({ where }: any) =>
        where.id === 'pur-1'
          ? purchase
          : payments.find((p) => p.id === where.id) ?? null,
      ),
      find: jest.fn().mockResolvedValue(payments),
      createQueryBuilder: jest.fn(() => qb),
    };
    const receptionRepo = { findOne: jest.fn().mockResolvedValue(reception) };

    const manager: any = {
      getRepository: jest.fn((entity: { name?: string }) => {
        switch (entity?.name) {
          case 'Reception':
            return {
              findOne: jest.fn().mockResolvedValue(reception && { ...reception }),
              save: jest.fn(async (r) => {
                savedReception.push(r);
                return r;
              }),
            };
          case 'ProductVariant':
            return {
              findOne: jest.fn().mockResolvedValue(variant),
              save: jest.fn(async (v) => {
                savedVariants.push(JSON.parse(JSON.stringify(v)));
                return v;
              }),
            };
          case 'Installment':
            return { find: jest.fn().mockResolvedValue([]), save: jest.fn() };
          case 'LedgerEntry':
            return {
              find: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
              create: jest.fn((x) => x),
              save: jest.fn(async (x) => x),
            };
          default: // Transaction
            return {
              findOne: jest.fn(async ({ where }: any) =>
                where.id === 'pur-1'
                  ? { ...purchase }
                  : payments.find((p) => p.id === where.id) ?? null,
              ),
              create: jest.fn((x) => ({ id: 'void-1', ...x })),
              save: jest.fn(async (x) => {
                savedTx.push(x);
                return { id: 'void-1', ...x };
              }),
            };
        }
      }),
    };
    const dataSource: any = {
      getRepository: jest.fn((entity: { name?: string }) => {
        switch (entity?.name) {
          case 'StockLevel':
            return {
              find: jest.fn().mockResolvedValue([
                {
                  productVariantId: 'var-1',
                  storageId: 'st-1',
                  physicalStock: opts?.stock ?? 10,
                },
              ]),
            };
          case 'ProductVariant':
            return { find: jest.fn().mockResolvedValue([variant]) };
          default:
            return { findOne: jest.fn().mockResolvedValue(null) };
        }
      }),
      transaction: jest.fn(async (cb: any) => {
        if (opts?.failTransaction) {
          throw new Error('db down');
        }
        return cb(manager);
      }),
    };
    const transactionsService = {
      createTransaction: jest.fn(async () => ({ id: 'adj-1' })),
    };
    const documentNumbers = { allocateNext: jest.fn().mockResolvedValue('ANL-1') };

    const service = new ReceptionVoidService(
      receptionRepo as any,
      txRepo as any,
      dataSource,
      transactionsService as any,
      documentNumbers as any,
      { recalculate: jest.fn() } as any,
    );
    return {
      service,
      transactionsService,
      savedVariants,
      savedTx,
      savedReception,
      qb,
    };
  }

  it('rechaza motivo corto', async () => {
    const { service } = build();
    await expect(
      service.void(companyId, userId, receptionId, { reason: 'ab' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404 si la recepción no existe en la compañía', async () => {
    const { service } = build({ reception: null });
    await expect(
      service.void(companyId, userId, receptionId, { reason: 'error de digitación' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('400 si ya está anulada', async () => {
    const { service, transactionsService } = build({
      reception: { id: receptionId, companyId, status: ReceptionStatus.VOIDED },
    });
    await expect(
      service.void(companyId, userId, receptionId, { reason: 'error de digitación' }),
    ).rejects.toThrow('ya está anulada');
    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
  });

  it('bloquea si hay pagos a proveedor aplicados', async () => {
    const { service, transactionsService } = build({
      payments: [{ id: 'pay-1', status: TransactionStatus.CONFIRMED }],
    });
    await expect(
      service.void(companyId, userId, receptionId, { reason: 'error de digitación' }),
    ).rejects.toThrow('pago(s) a proveedor aplicados');
    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
  });

  it('bloquea si hay devoluciones o notas de crédito', async () => {
    const { service } = build({ returnCount: 1 });
    await expect(
      service.void(companyId, userId, receptionId, { reason: 'error de digitación' }),
    ).rejects.toThrow('devoluciones');
  });

  it('bloquea si el stock ya fue consumido', async () => {
    const { service, transactionsService } = build({ stock: 4 });
    await expect(
      service.void(companyId, userId, receptionId, { reason: 'error de digitación' }),
    ).rejects.toThrow('ya fue consumida o vendida');
    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
  });

  it('bloquea si el PMP no es restaurable, y permite con confirmación', async () => {
    const pmp = { pmp: 120 };
    const blocked = build({ pmp });
    await expect(
      blocked.service.void(companyId, userId, receptionId, {
        reason: 'error de digitación',
      }),
    ).rejects.toThrow('PMP');

    const ok = build({ pmp });
    const res = await ok.service.void(companyId, userId, receptionId, {
      reason: 'error de digitación',
      acknowledgePmpNotRestored: true,
    });
    expect(res.pmpRestoredVariantIds).toEqual([]);
    expect(res.warnings.join(' ')).toContain('no restaurado');
    expect(ok.savedVariants).toHaveLength(0);
  });

  it('anula: baja stock, restaura PMP, voida documentos y marca la recepción', async () => {
    const { service, transactionsService, savedVariants, savedReception, savedTx } =
      build({
        payments: [
          { id: 'pay-draft', status: TransactionStatus.DRAFT, metadata: {} },
        ],
      });
    const res = await service.void(companyId, userId, receptionId, {
      reason: '  factura mal ingresada ',
    });

    const dto = (transactionsService.createTransaction.mock.calls[0] as any[])[0];
    expect(dto.transactionType).toBe(TransactionType.ADJUSTMENT_OUT);
    expect(dto.metadata.origin).toBe('RECEPTION_VOID');
    expect(dto.lines[0]).toMatchObject({ productVariantId: 'var-1', quantity: 10 });

    expect(savedVariants[0].pmp).toBe(80);
    expect(savedVariants[0].pmpHistory.at(-1).source).toBe('void_reception');

    expect(savedReception[0]).toMatchObject({
      status: ReceptionStatus.VOIDED,
      voidReason: 'factura mal ingresada',
      voidedBy: userId,
    });
    expect(res.voidedPaymentIds).toEqual(['pay-draft']);
    expect(res.voidAdjustmentId).toBe('void-1');
    expect(res.stockAdjustmentId).toBe('adj-1');
    expect(
      savedTx.some((t) => t.transactionType === TransactionType.VOID_ADJUSTMENT),
    ).toBe(true);
    expect(
      savedTx.filter((t) => t.status === TransactionStatus.VOIDED).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('repone el stock si falla la transacción de base de datos', async () => {
    const { service, transactionsService } = build({ failTransaction: true });
    await expect(
      service.void(companyId, userId, receptionId, { reason: 'error de digitación' }),
    ).rejects.toThrow('db down');
    const calls = transactionsService.createTransaction.mock.calls as any[][];
    expect(calls).toHaveLength(2);
    expect(calls[1][0].transactionType).toBe(TransactionType.ADJUSTMENT_IN);
  });
});
