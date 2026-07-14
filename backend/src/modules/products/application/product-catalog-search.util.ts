import { toLatinSearchPattern } from '@common/text/fold-latin-search-text';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProductIdSearchQuery(search: string | undefined): boolean {
  const trimmed = (search ?? '').trim();
  return trimmed.length > 0 && UUID_RE.test(trimmed);
}

export type ProductCatalogSearchAliases = {
  product?: string;
};

/**
 * Filtro de texto para catálogo: nombre, marca (texto o catálogo), SKU y barcode de variantes.
 * Insensible a mayúsculas (ILIKE) y tildes (`unaccent` en columnas + término plegado en app).
 */
export function applyProductCatalogTextSearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search: string | undefined,
  aliases: ProductCatalogSearchAliases = {},
): void {
  const pattern = toLatinSearchPattern(search ?? '');
  if (!pattern) return;

  const productAlias = aliases.product ?? 'p';

  const catalogBrandJoined = qb.expressionMap.joinAttributes.some(
    (j) => j.alias?.name === 'catalogBrand',
  );
  if (!catalogBrandJoined) {
    qb.leftJoin(`${productAlias}.catalogBrand`, 'catalogBrand');
  }

  qb.andWhere(
    `(
      public.unaccent(COALESCE(${productAlias}.name, '')) ILIKE :productCatalogSearchQ
      OR public.unaccent(COALESCE(${productAlias}.brand, '')) ILIKE :productCatalogSearchQ
      OR public.unaccent(COALESCE(catalogBrand.name, '')) ILIKE :productCatalogSearchQ
      OR EXISTS (
        SELECT 1 FROM product_variants pv_search
        WHERE pv_search."productId" = ${productAlias}.id
          AND pv_search."deletedAt" IS NULL
          AND (
            public.unaccent(COALESCE(pv_search.sku, '')) ILIKE :productCatalogSearchQ
            OR public.unaccent(COALESCE(pv_search.barcode, '')) ILIKE :productCatalogSearchQ
          )
      )
    )`,
    { productCatalogSearchQ: pattern },
  );
}
