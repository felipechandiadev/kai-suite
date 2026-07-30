import { BadRequestException } from '@nestjs/common';
import { PosSyncService } from '@modules/pos-sync/application/pos-sync.service';
import { PosSyncCommandStatus } from '@modules/pos-sync/domain/pos-sync-command.entity';

describe('PosSyncService idempotency', () => {
  it('devuelve response_json guardado si clientOperationId ya existe', async () => {
    const saved = {
      success: true,
      clientOperationId: 'op-1',
      transactionId: 'tx-1',
      documentNumber: 'SALE-26-001',
    };

    const syncRepo = {
      findOne: jest.fn().mockResolvedValue({
        companyId: 'co-1',
        clientOperationId: 'op-1',
        responseJson: saved,
      }),
      create: jest.fn(),
      save: jest.fn(),
    };

    const service = new PosSyncService(
      syncRepo as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { executeDeposit: jest.fn(), executeWithdrawal: jest.fn() } as any,
      { execute: jest.fn() } as any,
    );

    jest.spyOn(require('@common/tenant/tenant.context').TenantContext, 'getCompanyId').mockReturnValue('co-1');

    const result = await service.syncSaleCommand({
      clientOperationId: 'op-1',
      deviceId: 'dev-1',
      commandType: 'SALE',
      userName: 'cashier',
      pointOfSaleId: 'pos-1',
      cashSessionId: 'sess-1',
      lines: [],
    });

    expect(result).toEqual(saved);
    expect(syncRepo.save).not.toHaveBeenCalled();
  });
});

describe('PosSyncCommandStatus', () => {
  it('expone estados de cola', () => {
    expect(PosSyncCommandStatus.SYNCED).toBe('SYNCED');
    expect(PosSyncCommandStatus.CONFLICT).toBe('CONFLICT');
  });
});

describe('PosSyncService stock conflict', () => {
  it('mapea stock insuficiente a 409 STOCK_CONFLICT', async () => {
    const syncRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((row) => row),
      save: jest.fn(),
    };

    const salesHandler = {
      execute: jest.fn().mockRejectedValue(
        new BadRequestException(
          'Stock insuficiente en sala de venta para SKU-1: se requieren 2 (unidad base), disponible 0.',
        ),
      ),
    };

    const service = new PosSyncService(
      syncRepo as any,
      salesHandler as any,
      { execute: jest.fn() } as any,
      { executeDeposit: jest.fn(), executeWithdrawal: jest.fn() } as any,
      { execute: jest.fn() } as any,
    );

    jest
      .spyOn(require('@common/tenant/tenant.context').TenantContext, 'getCompanyId')
      .mockReturnValue('co-1');

    const result = await service.syncSaleCommand({
      clientOperationId: 'op-stock',
      deviceId: 'dev-1',
      commandType: 'SALE',
      userName: 'cashier',
      pointOfSaleId: 'pos-1',
      cashSessionId: 'sess-1',
      lines: [],
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(409);
    expect(result.reason).toBe('STOCK_CONFLICT');
    expect(syncRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PosSyncCommandStatus.CONFLICT }),
    );
  });
});
