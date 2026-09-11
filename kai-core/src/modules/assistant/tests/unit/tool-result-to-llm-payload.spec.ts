import { toolResultToLlmPayload } from '../../application/tool-result-to-llm-payload';
import type { AssistantToolResult } from '../../domain/tool-result.types';

describe('toolResultToLlmPayload', () => {
  it('includes kpis and truncates table rows', () => {
    const result: AssistantToolResult = {
      toolName: 'run_sales_report',
      ok: true,
      summary: 'Ventas',
      rowCount: 10,
      blocks: [
        { type: 'kpi', items: [{ label: 'Neto', value: 1200 }] },
        {
          type: 'table',
          columns: [{ key: 'day', label: 'Día' }],
          rows: Array.from({ length: 10 }, (_, i) => ({ day: `d${i}` })),
        },
      ],
    };
    const payload = toolResultToLlmPayload(result, {
      reportId: 'sales-by-period',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-18',
    });
    expect(payload.ok).toBe(true);
    expect(payload.kpis).toEqual([{ label: 'Neto', value: 1200 }]);
    expect(payload.reportId).toBe('sales-by-period');
    expect(payload.dateFrom).toBe('2026-08-01');
    const table = payload.table as { rows: unknown[]; truncated: boolean };
    expect(table.rows).toHaveLength(8);
    expect(table.truncated).toBe(true);
  });
});
