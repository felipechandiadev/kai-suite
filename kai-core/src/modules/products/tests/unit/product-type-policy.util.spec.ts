import { ProductType } from '@modules/products/domain/product.entity';
import {
  PACK_COMPONENT_TYPES,
  isAgregadoProductType,
  isAllowedDiningRootProductType,
  isInsumoProductType,
  isPackProductType,
  isSellableProductType,
  isValidPackComponentType,
} from '../../application/helpers/product-type-policy.util';

describe('product-type-policy.util', () => {
  it('marks INSUMO as non-sellable', () => {
    expect(isSellableProductType(ProductType.INSUMO)).toBe(false);
    expect(isInsumoProductType(ProductType.INSUMO)).toBe(true);
  });

  it('marks retail types as sellable', () => {
    expect(isSellableProductType(ProductType.PHYSICAL)).toBe(true);
    expect(isSellableProductType(ProductType.ELABORADO)).toBe(true);
    expect(isSellableProductType(ProductType.PREPARADO)).toBe(true);
    expect(isSellableProductType('physical')).toBe(true);
    expect(isSellableProductType(ProductType.PACK)).toBe(true);
  });

  it('marks AGREGADO as non-sellable standalone', () => {
    expect(isSellableProductType(ProductType.AGREGADO)).toBe(false);
    expect(isAgregadoProductType(ProductType.AGREGADO)).toBe(true);
  });

  it('identifies PACK and valid pack components', () => {
    expect(isPackProductType(ProductType.PACK)).toBe(true);
    expect([...PACK_COMPONENT_TYPES]).toEqual([
      ProductType.PHYSICAL,
      ProductType.ELABORADO,
      ProductType.MANUFACTURADO,
    ]);
    expect(isValidPackComponentType(ProductType.PHYSICAL)).toBe(true);
    expect(isValidPackComponentType(ProductType.ELABORADO)).toBe(true);
    expect(isValidPackComponentType(ProductType.MANUFACTURADO)).toBe(true);
    expect(isValidPackComponentType(ProductType.AGREGADO)).toBe(false);
    expect(isValidPackComponentType(ProductType.INSUMO)).toBe(false);
    expect(isValidPackComponentType(ProductType.PACK)).toBe(false);
    expect(isValidPackComponentType(ProductType.PREPARADO)).toBe(false);
  });

  it('allows PACK as dining root line and rejects AGREGADO', () => {
    expect(isAllowedDiningRootProductType(ProductType.PACK)).toBe(true);
    expect(isAllowedDiningRootProductType(ProductType.PREPARADO)).toBe(true);
    expect(isAllowedDiningRootProductType(ProductType.PHYSICAL)).toBe(true);
    expect(isAllowedDiningRootProductType(ProductType.AGREGADO)).toBe(false);
    expect(isAllowedDiningRootProductType(ProductType.INSUMO)).toBe(false);
  });
});
