import { ProductType } from '@modules/products/domain/product.entity';

/** Tipos que pueden venderse (POS, eShop, precio de venta). */
const NON_SELLABLE_PRODUCT_TYPES = new Set<ProductType>([
  ProductType.INSUMO,
  ProductType.AGREGADO,
]);

/** Componentes válidos de un pack (kit fantasma). */
export const PACK_COMPONENT_TYPES: readonly ProductType[] = [
  ProductType.PHYSICAL,
  ProductType.ELABORADO,
  ProductType.MANUFACTURADO,
];

const PACK_COMPONENT_TYPE_SET = new Set<ProductType>(PACK_COMPONENT_TYPES);

export function isSellableProductType(
  productType: ProductType | string | null | undefined,
): boolean {
  const t = String(productType ?? '')
    .trim()
    .toUpperCase() as ProductType;
  if (!t) return true;
  return !NON_SELLABLE_PRODUCT_TYPES.has(t);
}

export function isInsumoProductType(
  productType: ProductType | string | null | undefined,
): boolean {
  return (
    String(productType ?? '')
      .trim()
      .toUpperCase() === ProductType.INSUMO
  );
}

export function isPackProductType(
  productType: ProductType | string | null | undefined,
): boolean {
  return (
    String(productType ?? '')
      .trim()
      .toUpperCase() === ProductType.PACK
  );
}

export function isAgregadoProductType(
  productType: ProductType | string | null | undefined,
): boolean {
  return (
    String(productType ?? '')
      .trim()
      .toUpperCase() === ProductType.AGREGADO
  );
}

export function isValidPackComponentType(
  productType: ProductType | string | null | undefined,
): boolean {
  const t = String(productType ?? '')
    .trim()
    .toUpperCase() as ProductType;
  return PACK_COMPONENT_TYPE_SET.has(t);
}

/** Ítem raíz de cuenta salón (PACK sí; AGREGADO solo como extra del host). */
const DINING_ROOT_PRODUCT_TYPES = new Set<ProductType>([
  ProductType.PREPARADO,
  ProductType.PHYSICAL,
  ProductType.ELABORADO,
  ProductType.MANUFACTURADO,
  ProductType.PACK,
]);

export function isAllowedDiningRootProductType(
  productType: ProductType | string | null | undefined,
): boolean {
  const t = String(productType ?? '')
    .trim()
    .toUpperCase() as ProductType;
  return DINING_ROOT_PRODUCT_TYPES.has(t);
}
