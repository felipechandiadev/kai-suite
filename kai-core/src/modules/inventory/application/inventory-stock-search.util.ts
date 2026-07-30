import { toLatinSearchPattern } from '@common/text/fold-latin-search-text';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * Filtro de texto para grilla de stock: nombre, marca (texto o catálogo), SKU y barcode.
 * Insensible a mayúsculas (ILIKE) y tildes (`unaccent` en columnas + término plegado en app).
 */
export function applyInventoryStockTextSearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search: string | undefined,
): void {
  const pattern = toLatinSearchPattern(search ?? '');
  if (!pattern) return;

  const joined = qb.expressionMap.joinAttributes.some(
    (j) => j.alias?.name === 'catalogBrand',
  );
  if (!joined) {
    qb.leftJoin('product.catalogBrand', 'catalogBrand');
  }

  qb.andWhere(
    `(
      unaccent(COALESCE(product.name, '')) ILIKE :stockSearchQ
      OR unaccent(COALESCE(product.brand, '')) ILIKE :stockSearchQ
      OR unaccent(COALESCE(catalogBrand.name, '')) ILIKE :stockSearchQ
      OR unaccent(COALESCE(variant.sku, '')) ILIKE :stockSearchQ
      OR unaccent(COALESCE(variant.barcode, '')) ILIKE :stockSearchQ
    )`,
    { stockSearchQ: pattern },
  );
}
