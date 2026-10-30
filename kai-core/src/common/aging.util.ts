export type AgingBucketKey =
  | 'current'
  | 'd1_30'
  | 'd31_60'
  | 'd61_90'
  | 'd90plus';

export const AGING_BUCKETS: ReadonlyArray<{ key: AgingBucketKey; label: string }> = [
  { key: 'current', label: 'Al día' },
  { key: 'd1_30', label: '1–30 días' },
  { key: 'd31_60', label: '31–60 días' },
  { key: 'd61_90', label: '61–90 días' },
  { key: 'd90plus', label: 'Más de 90 días' },
];

export interface AgingInputRow {
  id: string;
  partyId: string | null;
  partyName: string | null;
  documentNumber: string | null;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  amountPaid: number;
  pendingAmount: number;
  dueDate: string | null;
  daysOverdue: number;
}

export interface AgingItem extends AgingInputRow {
  bucket: AgingBucketKey;
}

export type AgingBuckets = Record<AgingBucketKey, number> & { total: number };

export interface AgingParty extends AgingBuckets {
  partyId: string | null;
  partyName: string;
  items: AgingItem[];
}

export interface AgingReport {
  asOf: string;
  buckets: ReadonlyArray<{ key: AgingBucketKey; label: string }>;
  parties: AgingParty[];
  totals: AgingBuckets;
}

export function agingBucketFor(daysOverdue: number): AgingBucketKey {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return 'd1_30';
  if (daysOverdue <= 60) return 'd31_60';
  if (daysOverdue <= 90) return 'd61_90';
  return 'd90plus';
}

function emptyBuckets(): AgingBuckets {
  return { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
}

/** Agrupa saldos pendientes por cliente/proveedor y por antigüedad de vencimiento. */
export function buildAgingReport(rows: AgingInputRow[], asOf: Date): AgingReport {
  const byParty = new Map<string, AgingParty>();
  const totals = emptyBuckets();

  for (const row of rows) {
    const pending = Math.round(Number(row.pendingAmount) || 0);
    if (pending <= 0) continue;
    const bucket = agingBucketFor(row.daysOverdue);
    const key = row.partyId ?? `name:${row.partyName ?? ''}`;
    let party = byParty.get(key);
    if (!party) {
      party = {
        partyId: row.partyId,
        partyName: row.partyName?.trim() || 'Sin nombre',
        ...emptyBuckets(),
        items: [],
      };
      byParty.set(key, party);
    }
    party[bucket] += pending;
    party.total += pending;
    totals[bucket] += pending;
    totals.total += pending;
    party.items.push({ ...row, pendingAmount: pending, bucket });
  }

  const parties = [...byParty.values()].sort((a, b) => b.total - a.total);
  for (const p of parties) {
    p.items.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  }
  return {
    asOf: asOf.toISOString().split('T')[0],
    buckets: AGING_BUCKETS,
    parties,
    totals,
  };
}
