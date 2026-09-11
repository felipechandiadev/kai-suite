import { mergeToolParams } from '../../application/assistant-tool-params';

describe('mergeToolParams', () => {
  it('merges nested params with top-level fields', () => {
    expect(
      mergeToolParams({
        reportId: 'customer-purchases',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-18',
        customerId: 'c-1',
        params: { branchId: 'b-1' },
      }),
    ).toEqual({
      branchId: 'b-1',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-18',
      customerId: 'c-1',
    });
  });

  it('ignores empty strings and unknown top-level keys', () => {
    expect(
      mergeToolParams({
        reportId: 'backorders-status',
        dateFrom: '  ',
        extra: 'no',
      }),
    ).toEqual({});
  });
});
