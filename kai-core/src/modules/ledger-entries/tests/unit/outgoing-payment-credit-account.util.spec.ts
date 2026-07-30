import {
  applyOutgoingCheckCreditOverride,
  resolveOutgoingPaymentCreditAccountCode,
  shouldSkipPaymentExecutionLedger,
} from '@modules/ledger-entries/application/outgoing-payment-credit-account.util';
import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { RuleScope } from '@modules/accounting-rules/domain/accounting-rule.entity';

describe('outgoing-payment-credit-account.util', () => {
  it('returns 2.1.10 for outgoing CHECK payments', () => {
    expect(
      resolveOutgoingPaymentCreditAccountCode(
        TransactionType.SUPPLIER_PAYMENT,
        PaymentMethod.CHECK,
      ),
    ).toBe('2.1.10');
    expect(
      resolveOutgoingPaymentCreditAccountCode(
        TransactionType.SALE,
        PaymentMethod.CHECK,
      ),
    ).toBeNull();
  });

  it('skips PAYMENT_EXECUTION ledger for CHECK', () => {
    expect(shouldSkipPaymentExecutionLedger(PaymentMethod.CHECK)).toBe(true);
    expect(shouldSkipPaymentExecutionLedger(PaymentMethod.TRANSFER)).toBe(
      false,
    );
  });

  it('overrides transaction-scope credit to cheques por pagar', () => {
    const map = new Map<string, string>([
      ['2.1.10', 'acc-payable'],
      ['1.1.02', 'acc-bank'],
    ]);
    const entries = applyOutgoingCheckCreditOverride(
      [
        {
          transactionId: 'tx-1',
          accountId: 'acc-bank',
          entryDate: new Date(),
          description: 'Pago',
          debit: 100,
          credit: 0,
          metadata: { scope: RuleScope.TRANSACTION },
        },
        {
          transactionId: 'tx-1',
          accountId: 'acc-bank',
          entryDate: new Date(),
          description: 'Pago',
          debit: 0,
          credit: 100,
          metadata: { scope: RuleScope.TRANSACTION },
        },
      ],
      map,
    );
    expect(entries[1].accountId).toBe('acc-payable');
    expect(entries[1].metadata?.outgoingCheckPayable).toBe(true);
  });
});
