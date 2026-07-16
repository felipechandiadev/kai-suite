import {
  allocateSalePaymentDebits,
  resolveAssetAccountCodeForPaymentMethod,
  resolveAccountIdByCode,
} from '../../application/sale-payment-debits.util';

describe('sale-payment-debits.util', () => {
  const accountByCode = new Map<string, string>([
    ['1101', 'acc-caja'],
    ['1102', 'acc-banco'],
    ['1201', 'acc-clientes'],
  ]);

  it('maps CASH to caja and cards to banco', () => {
    expect(resolveAssetAccountCodeForPaymentMethod('CASH')).toBe('1.1.01');
    expect(resolveAssetAccountCodeForPaymentMethod('DEBIT_CARD')).toBe('1.1.02');
    expect(resolveAssetAccountCodeForPaymentMethod('VOUCHER')).toBe('1.1.02');
    expect(resolveAssetAccountCodeForPaymentMethod('INTERNAL_CREDIT')).toBe(
      '1.1.03',
    );
  });

  it('resolves account id with code aliases', () => {
    expect(resolveAccountIdByCode('1.1.01', accountByCode)).toBe('acc-caja');
    expect(resolveAccountIdByCode('1.1.02', accountByCode)).toBe('acc-banco');
  });

  it('allocates one debit per snapshot', () => {
    const { lines, warnings } = allocateSalePaymentDebits(
      [
        { method: 'CASH', amount: 400, capturedAt: 'x' } as any,
        { method: 'DEBIT_CARD', amount: 900, capturedAt: 'x' } as any,
      ],
      accountByCode,
      'Venta',
    );
    expect(warnings).toHaveLength(0);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ accountId: 'acc-caja', debit: 400 });
    expect(lines[1]).toMatchObject({ accountId: 'acc-banco', debit: 900 });
  });
});
