import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryReportRunner } from '../../application/inventory-report.runner';
import {
  InventoryTransfersHandler,
  StockByCategoryHandler,
  StockByStorageHandler,
  StockMovementTrendHandler,
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

  it('signed delta for stock-moving types', () => {
    expect(inventorySignedDelta('ADJUSTMENT_IN')).toBe(1);
    expect(inventorySignedDelta('ADJUSTMENT_OUT')).toBe(-1);
    expect(inventorySignedDelta('TRANSFER_OUT')).toBe(-1);
    expect(inventorySignedDelta('TRANSFER_IN')).toBe(1);
    expect(inventorySignedDelta('SALE')).toBe(-1);
    expect(inventorySignedDelta('PURCHASE')).toBe(1);
    expect(inventorySignedDelta('SALE_RETURN')).toBe(1);
    expect(inventorySignedDelta('UNKNOWN')).toBe(0);
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

  it('stock-by-storage keeps qty charts per unit (no mixed qty total)', async () => {
    const q = {
      optionalUuid: () => undefined,
      optionalUuidList: () => undefined,
      stockByStorageRows: async () => ({
        rows: [
          {
            storageId: 's1',
            storageName: 'Bodega A',
            stockUnitId: 'u-un',
            stockUnit: 'un',
            skuCount: 2,
            qty: 10,
            valorConPmp: 1000,
            lineasSinPmp: 0,
          },
          {
            storageId: 's1',
            storageName: 'Bodega A',
            stockUnitId: 'u-kg',
            stockUnit: 'kg',
            skuCount: 1,
            qty: 4,
            valorConPmp: 200,
            lineasSinPmp: 0,
          },
        ],
      }),
    };
    const handler = new StockByStorageHandler(q as never);
    const result = await handler.run({ companyId: 'c1', params: {} });
    expect(result.totals?.qty).toBeUndefined();
    expect(result.totals?.valorConPmp).toBe(1200);
    expect(result.series.some((s) => s.id.includes('un'))).toBe(true);
    expect(result.series.some((s) => s.id.includes('kg'))).toBe(true);
    expect(result.rows).toHaveLength(2);
  });

  it('stock-by-category requires stockUnitIds and separates series by unit', async () => {
    const q = {
      requireUuidList: (_p: unknown, key: string) => {
        if (key === 'stockUnitIds') return ['u-un'];
        throw new BadRequestException('missing');
      },
      optionalUuidList: () => undefined,
      stockByCategoryRows: async () => ({
        rows: [
          {
            categoryId: 'c1',
            categoryName: 'Bebidas',
            stockUnitId: 'u-un',
            stockUnit: 'un',
            skuCount: 3,
            qty: 12,
            valorConPmp: 500,
            lineasSinPmp: 0,
          },
        ],
      }),
    };
    const handler = new StockByCategoryHandler(q as never);
    expect(() => handler.validate({})).not.toThrow();
    const result = await handler.run({ companyId: 'c1', params: { stockUnitIds: ['u-un'] } });
    expect(result.rows[0]?.stockUnit).toBe('un');
    expect(result.series.some((s) => s.label.includes('un'))).toBe(true);
  });

  it('stock-movement-trend emits one series per unit', async () => {
    const q = {
      parseDateRange: () => ({
        from: new Date('2026-01-01T00:00:00.000'),
        to: new Date('2026-01-31T23:59:59.999'),
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      }),
      requireUuidList: () => ['u-un', 'u-kg'],
      optionalUuidList: () => undefined,
      optionalUuid: () => undefined,
      stockMovementTrendRows: async () => ({
        rows: [
          {
            day: '2026-01-10',
            stockUnitId: 'u-un',
            stockUnit: 'un',
            qtyIn: 5,
            qtyOut: 2,
            qtyNet: 3,
            lineCount: 2,
          },
          {
            day: '2026-01-10',
            stockUnitId: 'u-kg',
            stockUnit: 'kg',
            qtyIn: 1,
            qtyOut: 0,
            qtyNet: 1,
            lineCount: 1,
          },
        ],
        byUnitSeries: [
          {
            stockUnitId: 'u-un',
            stockUnit: 'un',
            points: [{ day: '2026-01-10', qtyNet: 3 }],
          },
          {
            stockUnitId: 'u-kg',
            stockUnit: 'kg',
            points: [{ day: '2026-01-10', qtyNet: 1 }],
          },
        ],
        familyCounts: { sale: 1, purchase: 2 },
        qtyNetTotalByUnit: [
          { stockUnitId: 'u-un', stockUnit: 'un', qtyNet: 3 },
          { stockUnitId: 'u-kg', stockUnit: 'kg', qtyNet: 1 },
        ],
        truncated: false,
      }),
    };
    const handler = new StockMovementTrendHandler(q as never);
    const result = await handler.run({
      companyId: 'c1',
      params: {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        stockUnitIds: ['u-un', 'u-kg'],
      },
    });
    const trendSeries = result.series.filter((s) => s.id.startsWith('trend-'));
    expect(trendSeries).toHaveLength(2);
    expect(trendSeries.map((s) => s.id).sort()).toEqual(['trend-kg', 'trend-un']);
  });
});
