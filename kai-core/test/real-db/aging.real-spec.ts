import { DataSource } from 'typeorm';
import { InstallmentService } from '../../src/modules/installments/application/services/installment.service';
import { ReceptionsService } from '../../src/modules/receptions/application/receptions.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import {
  asCompany,
  BaseFixtures,
  createPhysicalVariant,
  createSupplier,
  loadBase,
  waitForStock,
} from './support/fixtures';

describe('Antigüedad de saldos (BD real)', () => {
  let ctx: RealDbContext;
  let ds: DataSource;
  let base: BaseFixtures;

  beforeAll(async () => {
    ctx = await bootRealDb();
    ds = ctx.app.get(DataSource);
    base = await loadBase(ds);
  });
  afterAll(async () => {
    await ctx?.close();
  });

  it('cuentas por cobrar: reparte saldos por tramo y excluye pagadas/anuladas', async () => {
    const supplierId = await createSupplier(ds, base);
    const { variantId } = await createPhysicalVariant(ds, base);
    const rec: any = await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: 'AG-1',
        documentType: 'factura',
        lines: [
          { productVariantId: variantId, receivedQuantity: 1, unitPrice: 10, unitCost: 10 },
        ],
      }),
    );
    await waitForStock(ds, variantId, base.storageId, 1);
    const txId = rec.transaction.id;

    const add = (n: number, amount: number, paid: number, daysAgo: number, status: string) =>
      ds.query(
        `INSERT INTO installments (company_id, "sourceType", "sourceTransactionId", "saleTransactionId", "installmentNumber", "totalInstallments", amount, "amountPaid", "dueDate", status)
         VALUES ($1,'SALE',$2,$2,$3,5,$4,$5, (now() - ($6 || ' days')::interval)::date, $7)`,
        [base.companyId, txId, n, amount, paid, String(daysAgo), status],
      );
    await add(1, 1000, 0, -10, 'PENDING'); // vence en 10 días → al día
    await add(2, 2000, 500, 45, 'PARTIAL'); // saldo 1500, 45 días → 31–60
    await add(3, 4000, 0, 120, 'OVERDUE'); // +90
    await add(4, 9000, 9000, 20, 'PAID'); // no cuenta
    await add(5, 7000, 0, 20, 'CANCELLED'); // no cuenta

    const report = await asCompany(base, () =>
      ctx.app.get(InstallmentService).getCustomerAging(base.companyId),
    );
    expect(report.totals.current).toBe(1000);
    expect(report.totals.d31_60).toBe(1500);
    expect(report.totals.d90plus).toBe(4000);
    expect(report.totals.total).toBe(6500);
    expect(report.parties.reduce((s, p) => s + p.items.length, 0)).toBe(3);
  });
});
