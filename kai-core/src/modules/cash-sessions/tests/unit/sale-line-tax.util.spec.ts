import { isLineTaxPlausible, plausibleTaxRates } from '../../application/sale-line-tax.util';

const iva = { id: 'iva', taxType: 'IVA', rate: 19, isActive: true };

describe('sale-line-tax.util', () => {
  it('deriva la tasa de los impuestos de la variante y de sus precios de lista', () => {
    const rates = plausibleTaxRates({
      variantTaxIds: ['iva'],
      catalogTaxes: [iva],
      priceItems: [{ netPrice: 1000, grossPrice: 1190 }],
    });
    expect(rates).toEqual([0.19]);
  });

  it('sin impuestos configurados la única tasa legítima es 0', () => {
    expect(plausibleTaxRates({ variantTaxIds: [], catalogTaxes: [iva], priceItems: [] })).toEqual([0]);
  });

  it('acepta el impuesto correcto y tolera el redondeo del precio bruto', () => {
    const rates = [0.19];
    expect(isLineTaxPlausible({ unitNet: 1000, quantity: 1, taxAmount: 190, rates })).toBe(true);
    expect(isLineTaxPlausible({ unitNet: 840, quantity: 3, taxAmount: 479, rates })).toBe(true); // 478,8 esperado
  });

  it('rechaza impuesto en cero o reducido en una variante gravada', () => {
    const rates = [0.19];
    expect(isLineTaxPlausible({ unitNet: 1000, quantity: 1, taxAmount: 0, rates })).toBe(false);
    expect(isLineTaxPlausible({ unitNet: 1000, quantity: 2, taxAmount: 100, rates })).toBe(false);
  });

  it('rechaza impuesto positivo en una variante sin impuestos', () => {
    expect(isLineTaxPlausible({ unitNet: 1000, quantity: 1, taxAmount: 190, rates: [0] })).toBe(false);
  });
});
