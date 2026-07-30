export type PmpHistorySource =
  | 'transaction_cost'
  | 'first_purchase'
  | 'manual_api'
  | 'initial';

/**
 * Entrada del historial de PMP almacenado en JSON en `product_variants.pmpHistory`.
 */
export interface PmpHistoryEntry {
  at: string;
  previousPmp: number;
  newPmp: number;
  source: PmpHistorySource;
  transactionId?: string;
  storageId?: string;
  unitCost?: number;
  quantity?: number;
}
