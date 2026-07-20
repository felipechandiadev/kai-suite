import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PurchasingReportRunner } from '../../application/purchasing-report.runner';
import { PurchasesByPeriodHandler } from '../../application/handlers/mvp.handlers';
import type { PurchasingReportHandler } from '../../domain/purchasing-report.types';

describe('PurchasingReportRunner', () => {
  function buildRunner(handlers: PurchasingReportHandler[]) {
    const runner = Object.create(PurchasingReportRunner.prototype) as PurchasingReportRunner;
    (runner as unknown as { handlers: Map<string, PurchasingReportHandler> }).handlers =
      new Map(handlers.map((h) => [h.id, h]));
    return runner;
  }

  it('lists catalog from registered handlers', () => {
    const stub: PurchasingReportHandler = {
      id: 'purchases-by-period',
      title: 'Resumen',
      description: 'desc',
      wave: 'mvp',
      validate: (p) => p,
      run: async () => ({
        reportId: 'purchases-by-period',
        title: 'Resumen',
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
        id: 'purchases-by-period',
        title: 'Resumen',
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

  it('dispatches to handler run after validate', async () => {
    const stub: PurchasingReportHandler = {
      id: 'purchase-detail',
      title: 'Detalle',
      description: 'd',
      wave: 'mvp',
      validate: (p) => ({ ...p, validated: true }),
      run: async (ctx) => ({
        reportId: 'purchase-detail',
        title: 'Detalle',
        generatedAt: new Date().toISOString(),
        params: ctx.params,
        summary: { ok: 1 },
        series: [{ id: 's', label: 's', chart: 'bar', points: [{ x: 'a', y: 2 }] }],
        columns: [],
        rows: [],
      }),
    };
    const runner = buildRunner([stub]);
    const result = await runner.run('co-1', 'purchase-detail', {
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    expect(result.reportId).toBe('purchase-detail');
    expect(result.params).toMatchObject({ validated: true });
    expect(result.summary.ok).toBe(1);
  });

  it('validates date range via period handler', () => {
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
    const handler = new PurchasesByPeriodHandler(q as never);
    expect(() => handler.validate({})).toThrow(BadRequestException);
    const validated = handler.validate({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    expect(validated.dateFrom).toBe('2026-01-01');
    expect(validated.dateTo).toBe('2026-01-31');
  });
});
