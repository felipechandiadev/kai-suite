import { BadRequestException } from '@nestjs/common';
import { ProductType } from '@modules/products/domain/product.entity';
import {
  assertManufacturadoForProductionAttributes,
  normalizeProductionTagKey,
  sanitizeProductionAttributesPayload,
} from '../../application/helpers/variant-production-attributes.util';

describe('variant-production-attributes.util', () => {
  describe('normalizeProductionTagKey', () => {
    it('normalizes and validates slug', () => {
      expect(normalizeProductionTagKey('Herrajes')).toBe('herrajes');
      expect(normalizeProductionTagKey('Hilos y Costura')).toBe('hilos-y-costura');
      expect(normalizeProductionTagKey('')).toBeNull();
      expect(normalizeProductionTagKey(null)).toBeNull();
    });
  });

  describe('assertManufacturadoForProductionAttributes', () => {
    it('allows MANUFACTURADO only', () => {
      expect(() =>
        assertManufacturadoForProductionAttributes(ProductType.MANUFACTURADO),
      ).not.toThrow();
      expect(() =>
        assertManufacturadoForProductionAttributes(ProductType.ELABORADO),
      ).toThrow(BadRequestException);
      expect(() =>
        assertManufacturadoForProductionAttributes(ProductType.PREPARADO),
      ).toThrow(BadRequestException);
    });
  });

  describe('sanitizeProductionAttributesPayload', () => {
    const attrId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const optId = '11111111-2222-4333-8444-555555555555';

    it('accepts valid payload', () => {
      const out = sanitizeProductionAttributesPayload([
        {
          id: attrId,
          name: 'Tipo de botón',
          description: 'Mismo costo',
          tagKey: 'Herrajes',
          tagLabel: 'Herrajes',
          displayOrder: 0,
          options: [{ id: optId, label: 'Madera', displayOrder: 0 }],
        },
      ]);
      expect(out).toHaveLength(1);
      expect(out[0].tagKey).toBe('herrajes');
      expect(out[0].options[0].label).toBe('Madera');
    });

    it('rejects empty name or options', () => {
      expect(() =>
        sanitizeProductionAttributesPayload([
          {
            id: attrId,
            name: '  ',
            displayOrder: 0,
            options: [{ id: optId, label: 'A', displayOrder: 0 }],
          },
        ]),
      ).toThrow(BadRequestException);
      expect(() =>
        sanitizeProductionAttributesPayload([
          {
            id: attrId,
            name: 'X',
            displayOrder: 0,
            options: [],
          },
        ]),
      ).toThrow(BadRequestException);
    });
  });
});
