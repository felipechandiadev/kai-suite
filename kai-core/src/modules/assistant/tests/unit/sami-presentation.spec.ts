import { reportResultToBlocks } from '../../application/report-to-blocks';
import { formatSamiCellDate } from '../../application/sami-date-format';
import { dedupeQueryEchoBlocks } from '../../application/dedupe-query-echo';
import type { AssistantBlock } from '../../domain/assistant-block.types';

describe('formatSamiCellDate', () => {
  it('formats ISO date strings as DD/MM/YYYY', () => {
    expect(formatSamiCellDate('2026-08-18')).toBe('18/08/2026');
    expect(formatSamiCellDate('2026-08-18T04:00:00.000Z')).toBe('18/08/2026');
  });
});

describe('reportResultToBlocks dates', () => {
  it('formats date cells in tables', () => {
    const blocks = reportResultToBlocks({
      title: 'Por día',
      columns: [{ key: 'day', label: 'Día' }],
      rows: [{ day: '2026-08-18T04:00:00.000Z' }],
    });
    const table = blocks.find((b) => b.type === 'table');
    expect(table && table.type === 'table' && table.rows[0].day).toBe('18/08/2026');
  });
});

describe('dedupeQueryEchoBlocks', () => {
  it('keeps a single query_echo', () => {
    const blocks: AssistantBlock[] = [
      { type: 'query_echo', query: { a: 1 } },
      { type: 'kpi', items: [{ label: 'x', value: 1 }] },
      { type: 'query_echo', query: { a: 2 } },
    ];
    const out = dedupeQueryEchoBlocks(blocks);
    expect(out.filter((b) => b.type === 'query_echo')).toHaveLength(1);
    expect(out[0]).toEqual({ type: 'query_echo', query: { a: 1 } });
  });
});
