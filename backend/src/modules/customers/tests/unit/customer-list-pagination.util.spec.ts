import { normalizeCustomerListPage } from '../../application/customer-list-pagination.util';

describe('normalizeCustomerListPage', () => {
  it('defaults to page 1 and pageSize 5', () => {
    expect(normalizeCustomerListPage()).toEqual({
      page: 1,
      pageSize: 5,
      skip: 0,
    });
  });

  it('clamps pageSize to 1–100 and accepts limit alias', () => {
    expect(normalizeCustomerListPage({ page: 2, limit: 25 })).toEqual({
      page: 2,
      pageSize: 25,
      skip: 25,
    });
    expect(normalizeCustomerListPage({ pageSize: 500 }).pageSize).toBe(100);
    expect(normalizeCustomerListPage({ pageSize: 0 }).pageSize).toBe(5);
  });
});
