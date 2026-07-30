export type StockAlertKind =
  | 'below_minimum'
  | 'above_maximum'
  | 'reorder';

export type StockUpdatedPayload = {
  companyId: string;
  storageId: string;
  productVariantId: string;
  physicalStock: number;
  availableStock: number;
  /** Total físico en todos los almacenes (umbrales a nivel variante). */
  totalPhysicalStock?: number;
  thresholdScope?: 'storage' | 'variant_total';
  transactionId?: string | null;
  alerts: StockAlertKind[];
};
