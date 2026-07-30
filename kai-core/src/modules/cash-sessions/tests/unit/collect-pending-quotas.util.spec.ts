import {
  Installment,
  InstallmentSourceType,
  InstallmentStatus,
} from '../../../installments/domain/installment.entity';
import {
  installmentPendingAmount,
  isInstallmentCollectible,
  resolveInstallmentSaleId,
} from '../../application/collect-pending-quotas.util';

function makeInstallment(partial: Partial<Installment>): Installment {
  return Object.assign(new Installment(), {
    sourceType: InstallmentSourceType.SALE,
    status: InstallmentStatus.PENDING,
    amount: 10000,
    amountPaid: 0,
    ...partial,
  });
}

describe('collect-pending-quotas.util', () => {
  it('computes pending amount', () => {
    const inst = makeInstallment({ amount: 10000, amountPaid: 3000 });
    expect(installmentPendingAmount(inst)).toBe(7000);
  });

  it('detects collectible installments', () => {
    expect(isInstallmentCollectible(makeInstallment({}))).toBe(true);
    expect(
      isInstallmentCollectible(
        makeInstallment({ status: InstallmentStatus.PAID, amountPaid: 10000 }),
      ),
    ).toBe(false);
    expect(
      isInstallmentCollectible(
        makeInstallment({ sourceType: InstallmentSourceType.PURCHASE }),
      ),
    ).toBe(false);
  });

  it('resolves sale id from source or legacy fields', () => {
    expect(
      resolveInstallmentSaleId(
        makeInstallment({ sourceTransactionId: 'sale-a' }),
      ),
    ).toBe('sale-a');
    expect(
      resolveInstallmentSaleId(
        makeInstallment({
          sourceTransactionId: undefined,
          saleTransactionId: 'sale-b',
        }),
      ),
    ).toBe('sale-b');
  });
});
