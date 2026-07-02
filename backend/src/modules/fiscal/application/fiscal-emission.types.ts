import type { FiscalBoletaPrintPreview } from '../domain/fiscal-boleta-print-preview';

export type FiscalEmissionResult = {
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  folio?: number;
  trackId?: string | null;
  error?: string;
  printPreview?: FiscalBoletaPrintPreview;
};
