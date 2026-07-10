import { BadRequestException } from '@nestjs/common';
import {
  applyTaxIdsToPriceRows,
  applyVariantFiscalProfile,
  effectiveGrossFactorFromCatalog,
  resolveDefaultIvaTaxIdsFromCatalog,
  validateSpecialCategoryPrices,
  type VariantPriceFiscalRow,
} from '../../application/helpers/variant-fiscal-profile';
import { isSpecialVariantTaxCategory } from '../../domain/variant-tax-category';

describe('variant-fiscal-profile', () => {
  const defaultIva = ['iva-default'];

  it('assigns default IVA when TAX_STANDARD and taxIds empty', () => {
    const result = applyVariantFiscalProfile(
      { taxCategory: 'TAX_STANDARD', requiresDte: true, taxIds: [] },
      defaultIva,
    );
    expect(result.taxIds).toEqual(['iva-default']);
    expect(result.requiresDte).toBe(true);
  });

  it('rejects TAX_PRE_PAID when gross differs from net', () => {
    expect(() =>
      applyVariantFiscalProfile(
        {
          taxCategory: 'TAX_PRE_PAID',
          priceListItems: [{ netPrice: 1000, grossPrice: 1190 }],
        },
        defaultIva,
      ),
    ).toThrow(BadRequestException);
  });

  it('accepts TAX_PRE_PAID when gross equals net and clears taxIds', () => {
    const result = applyVariantFiscalProfile(
      {
        taxCategory: 'TAX_PRE_PAID',
        requiresDte: false,
        taxIds: ['iva-default'],
        priceListItems: [{ netPrice: 5000, grossPrice: 5000, taxIds: ['iva-default'] }],
      },
      defaultIva,
    );
    expect(result.taxIds).toEqual([]);
    expect(result.requiresDte).toBe(false);
    expect(result.priceListItems?.[0].grossPrice).toBe(5000);
    expect(result.priceListItems?.[0].taxIds).toEqual([]);
  });

  it('resolveDefaultIvaTaxIdsFromCatalog prefers isDefault', () => {
    const ids = resolveDefaultIvaTaxIdsFromCatalog([
      { id: 'iva-1', taxType: 'IVA', isDefault: false, isActive: true },
      { id: 'iva-2', taxType: 'IVA', isDefault: true, isActive: true },
    ]);
    expect(ids).toEqual(['iva-2']);
  });

  it('validateSpecialCategoryPrices throws on mismatch', () => {
    const rows: VariantPriceFiscalRow[] = [{ netPrice: 100, grossPrice: 119 }];
    expect(() => validateSpecialCategoryPrices(rows)).toThrow(BadRequestException);
    expect(isSpecialVariantTaxCategory('TAX_EXTERNAL')).toBe(true);
  });

  it('effectiveGrossFactorFromCatalog sums IVA and SPECIFIC', () => {
    expect(
      effectiveGrossFactorFromCatalog(
        [
          { id: 'iva', taxType: 'IVA', rate: 19, isActive: true },
          { id: 'ila', taxType: 'SPECIFIC', rate: 10, isActive: true },
        ],
        ['iva', 'ila'],
      ),
    ).toBe(1.29);
  });

  it('applyTaxIdsToPriceRows recalculates gross from net', () => {
    const rows = applyTaxIdsToPriceRows(
      [{ netPrice: 1000, grossPrice: 1190, taxIds: ['iva'] }],
      ['iva', 'ila'],
      [
        { id: 'iva', taxType: 'IVA', rate: 19, isActive: true },
        { id: 'ila', taxType: 'SPECIFIC', rate: 10, isActive: true },
      ],
    );
    expect(rows[0]?.grossPrice).toBe(1290);
    expect(rows[0]?.taxIds).toEqual(['iva', 'ila']);
  });

  it('TAX_EXEMPT clears taxIds and keeps requiresDte when requested', () => {
    const result = applyVariantFiscalProfile(
      {
        taxCategory: 'TAX_EXEMPT',
        requiresDte: true,
        taxIds: ['iva-default'],
        priceListItems: [{ netPrice: 10000, grossPrice: 10000 }],
      },
      defaultIva,
    );
    expect(result.taxIds).toEqual([]);
    expect(result.requiresDte).toBe(true);
    expect(result.priceListItems?.[0].grossPrice).toBe(10000);
  });

  it('TAX_OUT_OF_SCOPE forces requiresDte false and clears taxIds', () => {
    const result = applyVariantFiscalProfile(
      {
        taxCategory: 'TAX_OUT_OF_SCOPE',
        requiresDte: true,
        taxIds: ['iva-default'],
      },
      defaultIva,
    );
    expect(result.taxIds).toEqual([]);
    expect(result.requiresDte).toBe(false);
  });
});
