import {
  resolveAccountsPayableOriginCategory,
  isOperationalExpenseParent,
} from '@modules/transactions/application/helpers/accounts-payable-origin.util';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

describe('accounts-payable-origin.util', () => {
  it('classifies payroll payments', () => {
    expect(
      resolveAccountsPayableOriginCategory(TransactionType.PAYROLL_PAYMENT, null),
    ).toBe('PAYROLL');
  });

  it('classifies expense payments as operating expense', () => {
    expect(
      resolveAccountsPayableOriginCategory(TransactionType.EXPENSE_PAYMENT, null),
    ).toBe('OPERATING_EXPENSE');
  });

  it('classifies supplier payment with purchase invoice parent as purchase', () => {
    expect(
      resolveAccountsPayableOriginCategory(TransactionType.SUPPLIER_PAYMENT, {
        transactionType: TransactionType.SUPPLIER_INVOICE,
        metadata: {},
      } as any),
    ).toBe('PURCHASE');
  });

  it('classifies supplier payment linked to operational expense DTE', () => {
    const parent = {
      transactionType: TransactionType.SUPPLIER_RECEIPT,
      metadata: {
        links: { operationalExpenseId: 'oe-1' },
      },
    };
    expect(isOperationalExpenseParent(parent as any)).toBe(true);
    expect(
      resolveAccountsPayableOriginCategory(
        TransactionType.SUPPLIER_PAYMENT,
        parent as any,
      ),
    ).toBe('OPERATING_EXPENSE');
  });

  it('classifies supplier payment with OPERATING_EXPENSE parent', () => {
    expect(
      resolveAccountsPayableOriginCategory(TransactionType.SUPPLIER_PAYMENT, {
        transactionType: TransactionType.OPERATING_EXPENSE,
        metadata: {},
      } as any),
    ).toBe('OPERATING_EXPENSE');
  });
});
