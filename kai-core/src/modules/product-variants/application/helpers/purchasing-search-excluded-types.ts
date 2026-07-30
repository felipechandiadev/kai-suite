import { ProductType } from '@modules/products/domain/product.entity';

/** Tipos excluidos de `GET /product-variants/purchasing-search` (Fase A producción). */
export const PURCHASING_SEARCH_EXCLUDED_PRODUCT_TYPES: readonly ProductType[] = [
  ProductType.MANUFACTURADO,
  ProductType.ELABORADO,
  ProductType.PREPARADO,
  ProductType.SERVICE,
  ProductType.DIGITAL,
] as const;
