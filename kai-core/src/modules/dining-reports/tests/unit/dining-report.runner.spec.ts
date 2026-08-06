import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DiningReportRunner } from '../../application/dining-report.runner';
import { DiningSalonSummaryHandler } from '../../application/handlers/mvp.handlers';
import type { DiningReportHandler } from '../../domain/dining-report.types';

describe('DiningReportRunner', () => {
  function buildRunner(handlers: DiningReportHandler[]) {
    const runner = Object.create(
      DiningReportRunner.prototype,
    ) as DiningReportRunner;
    (runner as unknown as { handlers: Map<string, DiningReportHandler> }).handlers =
      new Map(handlers.map((h) => [h.id, h]));
    return runner;
  }

  it('lists catalog from registered handlers', () => {
    const stub: DiningReportHandler = {
      id: 'dining-salon-summary',
      title: 'Resumen',
      description: 'desc',
      wave: 'mvp',
      validate: (p) => p,
      run: async () => ({
        reportId: 'dining-salon-summary',
        title: 'Resumen',
        generatedAt: new Date().toISOString(),
        params: {},
        summary: {},
        series: [
          { id: 's', label: 's', chart: 'bar', points: [{ x: 'a', y: 1 }] },
        ],
        columns: [],
        rows: [],
      }),
    };
    const runner = buildRunner([stub]);
    expect(runner.listCatalog()).toEqual([
      {
        id: 'dining-salon-summary',
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

  it('validates date range via summary handler', () => {
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
      optionalOrderKind: () => undefined,
    };
    const handler = new DiningSalonSummaryHandler(q as never);
    expect(() => handler.validate({})).toThrow(BadRequestException);
    const validated = handler.validate({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    expect(validated.dateFrom).toBe('2026-01-01');
    expect(validated.dateTo).toBe('2026-01-31');
  });
});
