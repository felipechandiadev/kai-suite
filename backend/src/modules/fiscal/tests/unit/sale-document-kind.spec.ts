import {
  isSaleDocumentKind,
  normalizeSaleDocumentKind,
  saleDocumentKindToDteType,
} from '../../domain/sale-document-kind';

describe('sale-document-kind', () => {
  it('maps BOLETA to DTE 39', () => {
    expect(saleDocumentKindToDteType('BOLETA')).toBe(39);
  });

  it('maps TICKET to null DTE', () => {
    expect(saleDocumentKindToDteType('TICKET')).toBeNull();
  });

  it('normalizes unknown values to TICKET', () => {
    expect(normalizeSaleDocumentKind('invalid')).toBe('TICKET');
    expect(normalizeSaleDocumentKind('boleta')).toBe('BOLETA');
  });

  it('validates known kinds', () => {
    expect(isSaleDocumentKind('FACTURA')).toBe(true);
    expect(isSaleDocumentKind('INVOICE')).toBe(false);
  });
});
