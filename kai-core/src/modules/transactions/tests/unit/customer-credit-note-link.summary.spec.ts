import { buildCustomerCreditNoteLinkSummary } from '../../application/read-models/customer-credit-note-link.summary';
import { TransactionStatus, TransactionType } from '../../domain/transaction.entity';

describe('buildCustomerCreditNoteLinkSummary', () => {
  it('marks note as available when nothing consumed', () => {
    const summary = buildCustomerCreditNoteLinkSummary({
      id: 'nc-1',
      documentNumber: 'NCC-26-00001',
      total: 10000,
      status: TransactionStatus.CONFIRMED,
      metadata: {},
      transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
    } as never);
    expect(summary.usageStatus).toBe('available');
    expect(summary.availableAmount).toBe(10000);
    expect(summary.consumedAmount).toBe(0);
  });

  it('marks note as fully used when balance is zero', () => {
    const summary = buildCustomerCreditNoteLinkSummary({
      id: 'nc-2',
      documentNumber: 'NCC-26-00002',
      total: 5000,
      status: TransactionStatus.CONFIRMED,
      metadata: { creditNote: { consumedAmount: 5000 } },
      transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
    } as never);
    expect(summary.usageStatus).toBe('fully_used');
    expect(summary.availableAmount).toBe(0);
  });

  it('marks note as partially used', () => {
    const summary = buildCustomerCreditNoteLinkSummary({
      id: 'nc-3',
      documentNumber: 'NCC-26-00003',
      total: 8000,
      status: TransactionStatus.CONFIRMED,
      metadata: { creditNote: { consumedAmount: 3000 } },
      transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
    } as never);
    expect(summary.usageStatus).toBe('partially_used');
    expect(summary.availableAmount).toBe(5000);
  });
});
