import {
  resolveNegativeStockPolicy,
  sanitizeCompanyInventorySettings,
} from '../../domain/company-inventory-settings.types';

describe('política de stock negativo', () => {
  it('por defecto bloquea (comportamiento histórico)', () => {
    expect(resolveNegativeStockPolicy(undefined)).toBe('BLOCK');
    expect(resolveNegativeStockPolicy({})).toBe('BLOCK');
    expect(resolveNegativeStockPolicy({ inventory: { negativeStockPolicy: 'xx' } })).toBe('BLOCK');
  });

  it('lee ALLOW / WARN / BLOCK desde settings.inventory', () => {
    for (const p of ['ALLOW', 'WARN', 'BLOCK'] as const) {
      expect(resolveNegativeStockPolicy({ inventory: { negativeStockPolicy: p } })).toBe(p);
    }
  });

  it('sanea la configuración entrante', () => {
    expect(sanitizeCompanyInventorySettings({ negativeStockPolicy: 'WARN', otro: 1 })).toEqual({
      negativeStockPolicy: 'WARN',
    });
    expect(sanitizeCompanyInventorySettings(null)).toEqual({ negativeStockPolicy: 'BLOCK' });
  });
});
