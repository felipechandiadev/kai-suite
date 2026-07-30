export const OFFLINE_CATALOG_SCHEMA_VERSION = 6;

export function catalogRowId(
  pointOfSaleId: string,
  priceListId: string,
  variantId: string,
): string {
  return `${pointOfSaleId}:${priceListId}:${variantId}`;
}

export function catalogMetaId(pointOfSaleId: string, priceListId: string): string {
  return `${pointOfSaleId}:${priceListId}`;
}

export function stockSnapshotRowId(
  pointOfSaleId: string,
  priceListId: string,
  variantId: string,
): string {
  return catalogRowId(pointOfSaleId, priceListId, variantId);
}
