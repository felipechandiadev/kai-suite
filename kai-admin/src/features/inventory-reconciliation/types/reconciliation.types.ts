export type ReconciliationRow = {
  variantId: string;
  storageId: string;
  productName: string | null;
  sku: string | null;
  storageName: string | null;
  recordedStock: number;
  expectedStock: number;
  difference: number;
  pmp: number | null;
  differenceValue: number | null;
};

export type StockEventFailure = {
  transactionId: string;
  documentNumber: string | null;
  transactionType: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  updatedAt: string;
};

export type ReconciliationReport = {
  asOf: string;
  checked: number;
  mismatches: ReconciliationRow[];
  totals: { recordedValue: number; mismatchValue: number };
};
