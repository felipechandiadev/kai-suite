import { agingBucketFor, buildAgingReport, AgingInputRow } from './aging.util';

const row = (over: Partial<AgingInputRow>): AgingInputRow => ({
  id: 'x',
  partyId: 'p1',
  partyName: 'Cliente 1',
  documentNumber: 'V-1',
  installmentNumber: 1,
  totalInstallments: 1,
  amount: 100,
  amountPaid: 0,
  pendingAmount: 100,
  dueDate: '2026-01-01',
  daysOverdue: 0,
  ...over,
});

describe('aging.util', () => {
  it('asigna tramos por días de atraso', () => {
    expect(agingBucketFor(-5)).toBe('current');
    expect(agingBucketFor(0)).toBe('current');
    expect(agingBucketFor(1)).toBe('d1_30');
    expect(agingBucketFor(30)).toBe('d1_30');
    expect(agingBucketFor(31)).toBe('d31_60');
    expect(agingBucketFor(60)).toBe('d31_60');
    expect(agingBucketFor(61)).toBe('d61_90');
    expect(agingBucketFor(90)).toBe('d61_90');
    expect(agingBucketFor(91)).toBe('d90plus');
  });

  it('agrupa por parte, suma por tramo y ordena por saldo', () => {
    const r = buildAgingReport(
      [
        row({ id: 'a', pendingAmount: 100, daysOverdue: 0 }),
        row({ id: 'b', pendingAmount: 50, daysOverdue: 45 }),
        row({ id: 'c', partyId: 'p2', partyName: 'Cliente 2', pendingAmount: 500, daysOverdue: 120 }),
        row({ id: 'd', pendingAmount: 0 }),
      ],
      new Date('2026-06-01'),
    );
    expect(r.parties.map((p) => p.partyId)).toEqual(['p2', 'p1']);
    expect(r.parties[1]).toMatchObject({ current: 100, d31_60: 50, total: 150 });
    expect(r.totals).toMatchObject({ current: 100, d31_60: 50, d90plus: 500, total: 650 });
    expect(r.parties[1].items).toHaveLength(2);
  });
});
