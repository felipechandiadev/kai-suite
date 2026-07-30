import { toLatinSearchPattern } from '@common/text/fold-latin-search-text';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export type EShopCatalogSearchAliases = {
  product?: string;
  brand?: string;
  category?: string;
  variant?: string;
};

/**
 * Búsqueda de catálogo eShop: ILIKE + sin tildes (`unaccent` + término plegado).
 */
export function applyEShopCatalogTextSearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search: string | undefined,
  aliases: EShopCatalogSearchAliases = {},
): void {
  const pattern = toLatinSearchPattern(search ?? '');
  if (!pattern) return;

  const p = aliases.product ?? 'p';
  const brand = aliases.brand ?? 'brand';
  const cat = aliases.category ?? 'cat';

  qb.andWhere(
    `(
      public.unaccent(COALESCE(${p}.name, '')) ILIKE :eshopCatalogSearchQ
      OR public.unaccent(COALESCE(${brand}.name, ${p}.brand, '')) ILIKE :eshopCatalogSearchQ
      OR public.unaccent(COALESCE(${cat}.name, '')) ILIKE :eshopCatalogSearchQ
    )`,
    { eshopCatalogSearchQ: pattern },
  );
}

/** Listado simple eShop (nombre + SKU de variante visible). */
export function applyEShopProductListTextSearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search: string | undefined,
  aliases: Pick<EShopCatalogSearchAliases, 'product' | 'variant'> = {},
): void {
  const pattern = toLatinSearchPattern(search ?? '');
  if (!pattern) return;

  const p = aliases.product ?? 'p';
  const v = aliases.variant ?? 'v';

  qb.andWhere(
    `(
      public.unaccent(COALESCE(${p}.name, '')) ILIKE :eshopListSearchQ
      OR public.unaccent(COALESCE(${v}.sku, '')) ILIKE :eshopListSearchQ
    )`,
    { eshopListSearchQ: pattern },
  );
}
