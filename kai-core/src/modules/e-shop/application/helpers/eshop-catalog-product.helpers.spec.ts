import {
  buildAttributeOptions,
  pickDefaultVariantId,
  resolveVariantAttributeLabels,
} from './eshop-catalog-product.helpers';

describe('eshop-catalog-product.helpers', () => {
  describe('resolveVariantAttributeLabels', () => {
    it('maps attribute ids to human names', () => {
      const map = new Map([['attr-1', 'Color']]);
      expect(
        resolveVariantAttributeLabels({ 'attr-1': 'Rojo' }, map),
      ).toEqual({ Color: 'Rojo' });
    });

    it('keeps key when attribute id is unknown', () => {
      expect(resolveVariantAttributeLabels({ Talla: 'M' }, new Map())).toEqual({
        Talla: 'M',
      });
    });
  });

  describe('buildAttributeOptions', () => {
    it('collects unique values per dimension preserving order', () => {
      expect(
        buildAttributeOptions([
          { attributeValues: { Color: 'Rojo', Talla: 'S' } },
          { attributeValues: { Color: 'Azul', Talla: 'S' } },
          { attributeValues: { Color: 'Rojo', Talla: 'M' } },
        ]),
      ).toEqual({
        Color: ['Rojo', 'Azul'],
        Talla: ['S', 'M'],
      });
    });
  });

  describe('pickDefaultVariantId', () => {
    it('prefers first in-stock variant', () => {
      expect(
        pickDefaultVariantId([
          { id: 'a', inStock: false },
          { id: 'b', inStock: true },
        ]),
      ).toBe('b');
    });

    it('falls back to first variant', () => {
      expect(
        pickDefaultVariantId([
          { id: 'a', inStock: false },
          { id: 'b', inStock: false },
        ]),
      ).toBe('a');
    });
  });
});
