export type SalePriceHistorySource = 'variant_create' | 'catalog_edit';

/**
 * Entrada del historial de precios de venta en JSON (`product_variants.salePriceHistory`).
 * El precio vigente sigue en `price_list_items` y `basePrice`.
 */
export interface SalePriceHistoryEntry {
  at: string;
  source: SalePriceHistorySource;
  /** Usuario que registró el cambio (Bearer / tenant). */
  userId?: string;
  /** Nombre para mostrar (solo en respuestas API; no se persiste en JSON). */
  userDisplayName?: string;
  /** Lista afectada; ausente si el evento es solo `basePrice`. */
  priceListId?: string;
  priceListName?: string;
  previousNet?: number;
  newNet?: number;
  previousGross?: number;
  newGross?: number;
  previousTaxIds?: string[] | null;
  newTaxIds?: string[] | null;
  previousBasePrice?: number;
  newBasePrice?: number;
}
