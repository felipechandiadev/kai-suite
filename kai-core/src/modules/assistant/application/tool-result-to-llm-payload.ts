import type { AssistantToolResult } from '../domain/tool-result.types';

const MAX_TABLE_ROWS = 8;

export function toolResultToLlmPayload(
  result: AssistantToolResult,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ok: result.ok,
    summary: result.summary,
    errorCode: result.errorCode ?? null,
    rowCount: result.rowCount ?? 0,
  };
  if (typeof args.reportId === 'string' && args.reportId.trim()) {
    payload.reportId = args.reportId.trim();
  }
  if (typeof args.dateFrom === 'string' && args.dateFrom.trim()) {
    payload.dateFrom = args.dateFrom.trim();
  }
  if (typeof args.dateTo === 'string' && args.dateTo.trim()) {
    payload.dateTo = args.dateTo.trim();
  }
  const kpi = result.blocks.find((b) => b.type === 'kpi');
  if (kpi && kpi.type === 'kpi') {
    payload.kpis = kpi.items;
  }
  const table = result.blocks.find((b) => b.type === 'table');
  if (table && table.type === 'table') {
    payload.table = {
      title: table.title ?? null,
      columns: table.columns.map((c) => ({ key: c.key, label: c.label })),
      rows: table.rows.slice(0, MAX_TABLE_ROWS).map((row) => {
        const o: Record<string, unknown> = {};
        for (const c of table.columns) {
          o[c.key] = row[c.key] ?? null;
        }
        return o;
      }),
      truncated: table.rows.length > MAX_TABLE_ROWS,
    };
  }
  return payload;
}
