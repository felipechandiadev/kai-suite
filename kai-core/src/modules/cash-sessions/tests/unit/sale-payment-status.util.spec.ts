import {
  isSaleFullyPaidByReceivedAmount,
  resolveSalePaymentStatusFromReceived,
  saleAmountPaidField,
} from '../../application/sale-payment-status.util';
import { PaymentStatus } from '../../../transactions/domain/transaction.entity';

describe('sale-payment-status.util', () => {
  it('treats overpay as fully paid', () => {
    expect(isSaleFullyPaidByReceivedAmount(10_000, 15_000)).toBe(true);
    expect(
      resolveSalePaymentStatusFromReceived({
        deferPayment: false,
        hasPayments: true,
        total: 10_000,
        paidReceived: 15_000,
      }),
    ).toBe(PaymentStatus.PAID);
  });

  it('stores sale amountPaid as total when paid with change', () => {
    expect(
      saleAmountPaidField({
        deferPayment: false,
        total: 10_000,
        paidReceived: 15_000,
      }),
    ).toBe(10_000);
  });

  it('marks partial when underpaid', () => {
    expect(
      resolveSalePaymentStatusFromReceived({
        deferPayment: false,
        hasPayments: true,
        total: 10_000,
        paidReceived: 4_000,
      }),
    ).toBe(PaymentStatus.PARTIAL);
  });

  it('defer stays pending with zero paid', () => {
    expect(
      resolveSalePaymentStatusFromReceived({
        deferPayment: true,
        hasPayments: false,
        total: 10_000,
        paidReceived: 0,
      }),
    ).toBe(PaymentStatus.PENDING);
  });
});
