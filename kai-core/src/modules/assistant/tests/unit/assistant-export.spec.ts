import { AssistantExportService } from '../../application/assistant-export.service';
import type { AssistantBlock } from '../../domain/assistant-block.types';

const blocks: AssistantBlock[] = [
  { type: 'kpi', items: [{ label: 'Neto', value: 1500 }] },
  {
    type: 'table',
    title: 'Por día',
    columns: [
      { key: 'day', label: 'Día' },
      { key: 'neto', label: 'Neto' },
    ],
    rows: [{ day: '2026-08-18', neto: 1500 }],
  },
];

describe('AssistantExportService', () => {
  const svc = new AssistantExportService();

  it('builds xlsx with PK zip header', async () => {
    const file = await svc.export({ blocks, format: 'xlsx', title: 'Ventas' });
    expect(file.filename).toMatch(/\.xlsx$/);
    expect(file.buffer.subarray(0, 2).toString()).toBe('PK');
  });

  it('builds pdf with %PDF header', async () => {
    const file = await svc.export({ blocks, format: 'pdf', title: 'Ventas' });
    expect(file.filename).toMatch(/\.pdf$/);
    expect(file.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
