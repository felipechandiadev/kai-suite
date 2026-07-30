import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import {
  buildDefaultCompanyCatalog,
  defaultCompanyPaymentMethodId,
  mergeCompanyAndPos,
  sanitizeCompanyPaymentMethod,
  syncPosPaymentMethodsWithCatalog,
  validateCompanyPaymentMethods,
} from './payment-method-config.helpers';
import type { PosPaymentMethodConfig } from './payment-method-config.types';

describe('payment-method-config.helpers', () => {
  it('buildDefaultCompanyCatalog uses stable ids per method', () => {
    const a = buildDefaultCompanyCatalog();
    const b = buildDefaultCompanyCatalog();
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(a.find((x) => x.method === PaymentMethod.CASH)?.id).toBe(
      defaultCompanyPaymentMethodId(PaymentMethod.CASH),
    );
  });

  it('forces requireReference for CUSTOMER_CREDIT_NOTE, ORDER_ADVANCE and VOUCHER', () => {
    const list = validateCompanyPaymentMethods([
      {
        method: PaymentMethod.CUSTOMER_CREDIT_NOTE,
        requireReference: false,
      },
      {
        method: PaymentMethod.ORDER_ADVANCE,
        requireReference: false,
      },
      {
        method: PaymentMethod.VOUCHER,
        requireReference: false,
        voucherKindId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      },
    ]);
    expect(list[0].requireReference).toBe(true);
    expect(list[1].requireReference).toBe(true);
    expect(list[2].requireReference).toBe(true);
  });

  it('syncPosPaymentMethodsWithCatalog ignores implicit payment methods', () => {
    const cash = sanitizeCompanyPaymentMethod({ method: PaymentMethod.CASH }, 0);
    const advance = sanitizeCompanyPaymentMethod(
      { method: PaymentMethod.ORDER_ADVANCE },
      1,
    );
    const existing: PosPaymentMethodConfig[] = [
      {
        companyPaymentMethodId: cash.id,
        isEnabled: true,
        preloadOnPaymentScreen: true,
        preloadOrder: 0,
        isDefaultForChange: true,
      },
    ];
    const synced = syncPosPaymentMethodsWithCatalog([cash, advance], existing);
    expect(synced).toHaveLength(1);
    expect(synced[0]?.companyPaymentMethodId).toBe(cash.id);
  });

  it('syncPosPaymentMethodsWithCatalog adds new configurable company methods as disabled', () => {
    const cash = sanitizeCompanyPaymentMethod({ method: PaymentMethod.CASH }, 0);
    const transfer = sanitizeCompanyPaymentMethod(
      { method: PaymentMethod.TRANSFER },
      1,
    );
    const existing: PosPaymentMethodConfig[] = [
      {
        companyPaymentMethodId: cash.id,
        isEnabled: true,
        preloadOnPaymentScreen: true,
        preloadOrder: 0,
        isDefaultForChange: true,
      },
    ];
    const synced = syncPosPaymentMethodsWithCatalog([cash, transfer], existing);
    expect(synced).toHaveLength(2);
    expect(synced.find((s) => s.companyPaymentMethodId === transfer.id)?.isEnabled).toBe(
      false,
    );
  });

  it('mergeCompanyAndPos excludes implicit methods from effective catalog', () => {
    const company = [
      sanitizeCompanyPaymentMethod(
        { method: PaymentMethod.CUSTOMER_CREDIT_NOTE, requireReference: true },
        0,
      ),
    ];
    const effective = mergeCompanyAndPos(company, [
      {
        companyPaymentMethodId: company[0].id,
        isEnabled: true,
        preloadOnPaymentScreen: true,
        preloadOrder: 0,
        isDefaultForChange: false,
        requireReference: false,
      },
    ]);
    expect(effective).toHaveLength(0);
  });

  it('sanitizeFeePercent keeps card fee and clears non-card', () => {
    const card = sanitizeCompanyPaymentMethod(
      { method: PaymentMethod.CREDIT_CARD, feePercent: 2.5 },
      0,
    );
    expect(card.feePercent).toBe(2.5);
    const cash = sanitizeCompanyPaymentMethod(
      { method: PaymentMethod.CASH, feePercent: 2.5 },
      0,
    );
    expect(cash.feePercent).toBeNull();
  });

  it('sanitizeFeePercent rejects out of range', () => {
    expect(() =>
      sanitizeCompanyPaymentMethod(
        { method: PaymentMethod.DEBIT_CARD, feePercent: 101 },
        0,
      ),
    ).toThrow(/entre 0 y 100/);
    expect(() =>
      sanitizeCompanyPaymentMethod(
        { method: PaymentMethod.DEBIT_CARD, feePercent: -1 },
        0,
      ),
    ).toThrow(/entre 0 y 100/);
  });
});
