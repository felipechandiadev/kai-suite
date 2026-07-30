import { PaymentMethod } from '../../domain/transaction.entity';
import {
  buildPaymentSnapshotsFromSalePayments,
  getPaymentSnapshotsFromMetadata,
  getRepresentativePaymentMethod,
  isMultiPayment,
  resolveBankAccountKeyFromPaymentSnapshots,
} from '../../application/payment-snapshots.util';

describe('payment-snapshots.util', () => {
  it('builds snapshots from sale payments', () => {
    const snaps = buildPaymentSnapshotsFromSalePayments(
      [
        { paymentMethod: 'CASH', amount: 400 },
        { paymentMethod: 'DEBIT_CARD', amount: 900 },
      ],
      [],
      '2026-01-01T00:00:00.000Z',
    );
    expect(snaps).toHaveLength(2);
    expect(snaps[0].method).toBe('CASH');
    expect(snaps[1].amount).toBe(900);
  });

  it('persists normalized voucherData on snapshots', () => {
    const snaps = buildPaymentSnapshotsFromSalePayments(
      [
        {
          paymentMethod: 'VOUCHER',
          amount: 5000,
          reference: 'V-99',
          voucherData: {
            kindId: 'kind-1',
            kindCode: 'vk00001',
            kindName: 'Gas',
            issuerName: '  Emisor  ',
            faceValue: 5000.4,
          },
        },
      ],
      [],
      '2026-01-01T00:00:00.000Z',
    );
    expect(snaps).toHaveLength(1);
    expect(snaps[0].voucherData).toEqual({
      kindId: 'kind-1',
      kindCode: 'VK00001',
      kindName: 'Gas',
      issuerName: 'Emisor',
      faceValue: 5000,
      expiresAt: null,
    });
    expect(snaps[0].reference).toBe('V-99');
  });

  it('reads canonical metadata.payments first', () => {
    const snaps = getPaymentSnapshotsFromMetadata({
      payments: [{ method: 'CASH', amount: 100, capturedAt: 'x' }],
    });
    expect(snaps).toHaveLength(1);
    expect(snaps[0].amount).toBe(100);
  });

  it('falls back to paymentSnapshots legacy key', () => {
    const snaps = getPaymentSnapshotsFromMetadata({
      paymentSnapshots: [{ method: 'TRANSFER', amount: 50, capturedAt: 'x' }],
    });
    expect(snaps[0].method).toBe('TRANSFER');
  });

  it('representative method is highest amount', () => {
    const snaps = buildPaymentSnapshotsFromSalePayments(
      [
        { paymentMethod: 'CASH', amount: 400 },
        { paymentMethod: 'DEBIT_CARD', amount: 900 },
      ],
      [],
    );
    expect(getRepresentativePaymentMethod(snaps)).toBe(PaymentMethod.DEBIT_CARD);
    expect(isMultiPayment(snaps)).toBe(true);
  });

  it('resolveBankAccountKeyFromPaymentSnapshots prefers explicit key', () => {
    const snaps = buildPaymentSnapshotsFromSalePayments(
      [{ paymentMethod: 'TRANSFER', amount: 1000, bankAccountId: 'acc-a' }],
      [],
    );
    expect(
      resolveBankAccountKeyFromPaymentSnapshots(snaps, 'acc-explicit'),
    ).toBe('acc-explicit');
  });

  it('resolveBankAccountKeyFromPaymentSnapshots reads transfer snapshot', () => {
    const snaps = buildPaymentSnapshotsFromSalePayments(
      [
        { paymentMethod: 'CASH', amount: 400 },
        {
          paymentMethod: 'TRANSFER',
          amount: 14268,
          bankAccountId: 'seed-dev-banco-estado-cc',
        },
      ],
      [],
    );
    expect(resolveBankAccountKeyFromPaymentSnapshots(snaps)).toBe(
      'seed-dev-banco-estado-cc',
    );
  });

  it('getPaymentSnapshotsFromMetadata reads bankAccountId legacy field', () => {
    const snaps = getPaymentSnapshotsFromMetadata({
      payments: [
        {
          method: 'TRANSFER',
          amount: 14268,
          bankAccountId: 'seed-dev-banco-estado-cc',
          capturedAt: '2026-07-16T10:06:40.666Z',
        },
      ],
    });
    expect(snaps[0].bankAccountKey).toBe('seed-dev-banco-estado-cc');
  });
});
