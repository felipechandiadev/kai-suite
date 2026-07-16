import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SalesReportRunner } from '../../application/sales-report.runner';
import { SalesByPeriodHandler } from '../../application/handlers/mvp.handlers';
import type { SalesReportHandler } from '../../domain/sales-report.types';

describe('SalesReportRunner', () => {
  function buildRunner(handlers: SalesReportHandler[]) {
    const runner = Object.create(SalesReportRunner.prototype) as SalesReportRunner;
    (runner as unknown as { handlers: Map<string, SalesReportHandler> }).handlers =
      new Map(handlers.map((h) => [h.id, h]));
    return runner;
  }

  it('lists catalog from registered handlers', () => {
    const stub: SalesReportHandler = {
      id: 'sales-by-period',
      title: 'Resumen',
      description: 'desc',
      wave: 'mvp',
      validate: (p) => p,
      run: async () => ({
        reportId: 'sales-by-period',
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
        id: 'sales-by-period',
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
    const handler = new SalesByPeriodHandler(q as never);
    expect(() => handler.validate({})).toThrow(BadRequestException);
    const validated = handler.validate({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    expect(validated.dateFrom).toBe('2026-01-01');
    expect(validated.dateTo).toBe('2026-01-31');
  });
});

describe('margin quality footnote', () => {
  it('formats coverage', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SalesReportsQueryService } = require('../../application/sales-reports-query.service');
    const svc = Object.create(SalesReportsQueryService.prototype);
    const note = svc.marginFootnote({
      linesWithCost: 8,
      linesMissingCost: 2,
      coveragePct: 80,
    });
    expect(note).toContain('80%');
    expect(note).toContain('unitCost');
  });
});
