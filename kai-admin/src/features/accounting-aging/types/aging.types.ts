export type AgingKind = "receivable" | "payable";

export type AgingBucketKey = "current" | "d1_30" | "d31_60" | "d61_90" | "d90plus";

export type AgingItem = {
  id: string;
  documentNumber: string | null;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  amountPaid: number;
  pendingAmount: number;
  dueDate: string | null;
  daysOverdue: number;
  bucket: AgingBucketKey;
};

export type AgingBuckets = Record<AgingBucketKey, number> & { total: number };

export type AgingParty = AgingBuckets & {
  partyId: string | null;
  partyName: string;
  items: AgingItem[];
};

export type AgingReport = {
  asOf: string;
  buckets: { key: AgingBucketKey; label: string }[];
  parties: AgingParty[];
  totals: AgingBuckets;
};
