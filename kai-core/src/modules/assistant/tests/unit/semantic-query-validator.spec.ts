import { SemanticQueryValidator } from '../../application/semantic-query-validator.service';
import { SamiQueryError } from '../../domain/sami-query.types';

describe('SemanticQueryValidator', () => {
  const v = new SemanticQueryValidator();

  it('rejects missing date on sales', () => {
    expect(() =>
      v.validate(
        {
          version: 1,
          source: 'semantic',
          dataset: 'sales',
          metrics: ['net_sales'],
          dimensions: ['day'],
          filters: [],
        },
        { isAdmin: true, maxRows: 100 },
      ),
    ).toThrow(SamiQueryError);
  });

  it('accepts sales with date filter', () => {
    const q = v.validate(
      {
        version: 1,
        source: 'semantic',
        dataset: 'sales',
        metrics: ['net_sales'],
        dimensions: ['day'],
        filters: [{ field: 'date', op: 'between', value: ['2026-08-01', '2026-08-18'] }],
        limit: 50,
      },
      { isAdmin: false, maxRows: 100 },
    );
    expect(q.dataset).toBe('sales');
    expect(q.limit).toBe(50);
  });
});
