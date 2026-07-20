import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryReportRunner } from '../../application/inventory-report.runner';
import {
  InventoryTransfersHandler,
  StockValuationHandler,
} from '../../application/handlers/mvp.handlers';
import type { InventoryReportHandler } from '../../domain/inventory-report.types';
import {
  TRANSFER_EVENT_TYPES,
  computePmpValue,
  inventorySignedDelta,
} from '../../domain/inventory-movement-map';

describe('inventory movement map', () => {
  it('computes PMP value only with valid pmp', () => {
    expect(computePmpValue(10, 100)).toBe(1000);
    expect(computePmpValue(10, null)).toBeNull();
    expect(computePmpValue(10, undefined)).toBeNull();
    expect(computePmpValue(2.5, 19.9)).toBe(49.75);
  });

  it('signed delta for adjustments and transfers', () => {
    expect(inventorySignedDelta('ADJUSTMENT_IN')).toBe(1);
    expect(inventorySignedDelta('ADJUSTMENT_OUT')).toBe(-1);
    expect(inventorySignedDelta('TRANSFER_OUT')).toBe(-1);
    expect(inventorySignedDelta('TRANSFER_IN')).toBe(1);
    expect(inventorySignedDelta('SALE')).toBe(0);
  });

  it('transfer events count only TRANSFER_OUT', () => {
    expect(TRANSFER_EVENT_TYPES).toEqual(['TRANSFER_OUT']);
    expect(TRANSFER_EVENT_TYPES).not.toContain('TRANSFER_IN');
  });
});

describe('InventoryReportRunner', () => {
  function buildRunner(handlers: InventoryReportHandler[]) {
    const runner = Object.create(InventoryReportRunner.prototype) as InventoryReportRunner;
    (runner as unknown as { handlers: Map<string, InventoryReportHandler> }).handlers =
      new Map(handlers.map((h) => [h.id, h]));
    return runner;
  }

  it('lists catalog from registered handlers', () => {
    const stub: InventoryReportHandler = {
      id: 'stock-valuation',
      title: 'Valoración',
      description: 'desc',
      wave: 'mvp',
      validate: (p) => p,
      run: async () => ({
        reportId: 'stock-valuation',
        title: 'Valoración',
        generatedAt: new Date().toISOString(),
        params: {},
        summary: {},
        series: [{ id: 's', label: 's', chart: 'bar', points: [{ x: 'a', y: 1 }] }],
        columns: [],
        rows: [],
      }),
    };
    const runner = buildRunner([stub]);
    expect(runner.listCatalog()).toEqual([
      {
        id: 'stock-valuation',
        title: 'Valoración',
        description: 'desc',
        wave: 'mvp',
      },
    ]);
  });

  it('throws NotFound for unknown reportId', async () => {
    const runner = buildRunner([]);
    await expect(runner.run('co-1', 'unknown', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('valuation summary excludes null PMP from monetary total', async () => {
    const q = {
      optionalUuidList: () => undefined,
      optionalUuid: () => undefined,
      stockValuationRows: async () => ({
        rows: [
          {
            productVariantId: 'v1',
            sku: 'A',
            productName: 'A',
            storageLabel: 'B1',
            stockUnit: 'un',
            qty: 10,
            pmp: 100,
            valor: 1000,
          },
          {
            productVariantId: 'v2',
            sku: 'B',
            productName: 'B',
            storageLabel: 'B1',
            stockUnit: 'kg',
            qty: 5,
            pmp: null,
            valor: null,
          },
        ],
        truncated: false,
      }),
    };
    const handler = new StockValuationHandler(q as never);
    const result = await handler.run({ companyId: 'c1', params: {} });
    expect(result.summary.valorConPmp).toBe(1000);
    expect(result.summary.lineasSinPmp).toBe(1);
    expect(result.summary.qtyTotal).toBe(15);
  });

  it('transfers handler requires date range', () => {
    const q = {
      parseDateRange: (params: Record<string, unknown>) => {
        if (!params.dateFrom || !params.dateTo) {
          throw new BadRequestException('dateFrom es requerido (YYYY-MM-DD)');
        }
        return {
          from: new Date(`${params.dateFrom}T00:00:00.000`),
          to: new Date(`${params.dateTo}T23:59:59.999`),
          dateFrom: String(params.dateFrom).slice(0, 10),
          dateTo: String(params.dateTo).slice(0, 10),
        };
      },
      optionalUuid: () => undefined,
      optionalUuidList: () => undefined,
    };
    const handler = new InventoryTransfersHandler(q as never);
    expect(() => handler.validate({})).toThrow(BadRequestException);
  });
});
