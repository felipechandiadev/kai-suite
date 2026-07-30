import {
  buildDiningOrderProfileOnOpen,
  mergeDiningOrderCustomerName,
  normalizeDiningCustomerName,
} from '../../application/dining-order-profile.util';

describe('dining-order-profile.util', () => {
  describe('normalizeDiningCustomerName', () => {
    it('trims and rejects empty', () => {
      expect(normalizeDiningCustomerName('  Juan  ')).toBe('Juan');
      expect(normalizeDiningCustomerName('   ')).toBeNull();
      expect(normalizeDiningCustomerName(null)).toBeNull();
    });

    it('caps length at 80', () => {
      const long = 'a'.repeat(100);
      expect(normalizeDiningCustomerName(long)?.length).toBe(80);
    });
  });

  describe('buildDiningOrderProfileOnOpen', () => {
    it('defaults customerName to displayLabel', () => {
      expect(buildDiningOrderProfileOnOpen('Cuenta barra #1')).toEqual({
        customerName: 'Cuenta barra #1',
      });
    });

    it('keeps explicit customerName and other profile fields', () => {
      expect(
        buildDiningOrderProfileOnOpen('Mesa 5', {
          adultCount: 2,
          customerName: '  Ana  ',
          notes: 'ventana',
        }),
      ).toEqual({
        adultCount: 2,
        customerName: 'Ana',
        notes: 'ventana',
      });
    });
  });

  describe('mergeDiningOrderCustomerName', () => {
    it('updates name and preserves other fields', () => {
      expect(
        mergeDiningOrderCustomerName(
          { adultCount: 1, customerName: 'Cuenta barra #1' },
          'Pedro',
          'Cuenta barra #1',
        ),
      ).toEqual({
        adultCount: 1,
        customerName: 'Pedro',
      });
    });

    it('empty name falls back to displayLabel', () => {
      expect(
        mergeDiningOrderCustomerName(
          { customerName: 'Pedro' },
          '  ',
          'Cuenta barra #2',
        ),
      ).toEqual({
        customerName: 'Cuenta barra #2',
      });
    });
  });
});
