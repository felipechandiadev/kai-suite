import type { FiscalBoletaPrintPreview } from '../domain/fiscal-boleta-print-preview';

export type FiscalEmissionResult = {
  status: 'PENDING' | 'SENT' | 'EPR' | 'FAILED' | 'SKIPPED';
  emissionId?: string;
  folio?: number;
  trackId?: string | null;
  error?: string;
  printPreview?: FiscalBoletaPrintPreview;
  siiPending?: boolean;
};
