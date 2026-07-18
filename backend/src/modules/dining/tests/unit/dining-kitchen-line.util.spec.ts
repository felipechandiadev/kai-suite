import {
  variantAttributesForKitchen,
  kitchenVariantLabel,
} from '../../application/dining-kitchen-line.util';

describe('dining-kitchen-line.util', () => {
  it('kitchenVariantLabel prefers product name then sku', () => {
    expect(
      kitchenVariantLabel({
        sku: 'SKU-1',
        product: { name: 'Completo' },
      } as any),
    ).toBe('Completo');
    expect(kitchenVariantLabel({ sku: 'SKU-1' } as any)).toBe('SKU-1');
    expect(kitchenVariantLabel(null)).toBeNull();
  });

  it('variantAttributesForKitchen maps attributeValues values', () => {
    expect(
      variantAttributesForKitchen({
        attributeValues: { a: 'Grande', b: '  ', c: 'Sin mayo' },
      } as any),
    ).toEqual([{ attributeValue: 'Grande' }, { attributeValue: 'Sin mayo' }]);
    expect(variantAttributesForKitchen(null)).toEqual([]);
  });
});
