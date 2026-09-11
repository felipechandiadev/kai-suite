import { SemanticQueryCompiler } from '../../application/semantic-query-compiler.service';
import type { SamiQuery } from '../../domain/sami-query.types';

function salesQuery(partial: Partial<SamiQuery> = {}): SamiQuery {
  return {
    version: 1,
    source: 'semantic',
    dataset: 'sales',
    metrics: ['net_sales'],
    dimensions: ['day'],
    filters: [{ field: 'date', op: 'between', value: ['2026-08-01', '2026-08-18'] }],
    ...partial,
  };
}

describe('SemanticQueryCompiler', () => {
  it('maps weekday lunes to ISODOW 1 in SQL params', async () => {
    const queryFn = jest.fn().mockResolvedValue([{ weekday: 1, net_sales: 10 }]);
    const compiler = new SemanticQueryCompiler({ query: queryFn } as never);
    await compiler.run('co-1', salesQuery({
      dimensions: ['weekday'],
      filters: [
        { field: 'date', op: 'between', value: ['2026-08-01', '2026-08-18'] },
        { field: 'weekday', op: 'eq', value: 'lunes' },
      ],
    }));
    const [sql, params] = queryFn.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('"sold_dow"');
    expect(params).toContain(1);
  });

  it('accepts weekday=1 numeric', async () => {
    const queryFn = jest.fn().mockResolvedValue([]);
    const compiler = new SemanticQueryCompiler({ query: queryFn } as never);
    await compiler.run('co-1', salesQuery({
      dimensions: ['product'],
      filters: [
        { field: 'date', op: 'between', value: ['2026-08-01', '2026-08-18'] },
        { field: 'weekday', op: 'eq', value: 1 },
      ],
    }));
    const params = queryFn.mock.calls[0][1] as unknown[];
    expect(params).toContain(1);
  });

  it('defaults bar chart when dimension is day and chart is omitted', async () => {
    const queryFn = jest.fn().mockResolvedValue([
      { day: '2026-08-17', net_sales: 100 },
    ]);
    const compiler = new SemanticQueryCompiler({ query: queryFn } as never);
    const { blocks } = await compiler.run('co-1', salesQuery());
    const chart = blocks.find((b) => b.type === 'chart');
    expect(chart).toBeDefined();
    if (chart && chart.type === 'chart') {
      expect(chart.chart).toBe('bar');
    }
  });

  it('adds customer_id IS NOT NULL when grouping by customer', async () => {
    const queryFn = jest.fn().mockResolvedValue([]);
    const compiler = new SemanticQueryCompiler({ query: queryFn } as never);
    await compiler.run(
      'co-1',
      salesQuery({
        dimensions: ['customer'],
        orderBy: [{ field: 'net_sales', direction: 'desc' }],
        limit: 10,
      }),
    );
    const sql = queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('"customer_id" IS NOT NULL');
    expect(sql).toContain('"customer_name"');
  });

  it('does not auto-exclude walk-in when has_customer is explicit', async () => {
    const queryFn = jest.fn().mockResolvedValue([]);
    const compiler = new SemanticQueryCompiler({ query: queryFn } as never);
    await compiler.run(
      'co-1',
      salesQuery({
        dimensions: ['customer'],
        filters: [
          { field: 'date', op: 'between', value: ['2026-08-01', '2026-08-18'] },
          { field: 'has_customer', op: 'eq', value: false },
        ],
      }),
    );
    const sql = queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('"customer_id" IS NULL');
    expect(sql.match(/"customer_id" IS NOT NULL/)).toBeNull();
  });
});
