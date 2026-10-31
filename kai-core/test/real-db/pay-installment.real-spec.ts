import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { InstallmentService } from '../../src/modules/installments/application/services/installment.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import { asCompany, BaseFixtures, loadBase } from './support/fixtures';

describe('Pago de cuota por cobrar (BD real)', () => {
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

  it('pagos simultáneos de la misma cuota registran un solo cobro', async () => {
    const [{ id: customerId }] = await ds.query(`SELECT id FROM customers LIMIT 1`);
    const [{ id: cashHubId }] = await ds.query(`SELECT id FROM cash_hubs WHERE "companyId"=$1 LIMIT 1`, [
      base.companyId,
    ]);
    const [{ id: saleId }] = await ds.query(
      `INSERT INTO transactions ("transactionType", status, company_id, "branchId", "userId", "customerId",
         subtotal, total, "amountPaid", "paymentStatus", "documentNumber")
       VALUES ('SALE'::transactions_transactiontype_enum, 'CONFIRMED', $1, $2, $3, $4, 3000, 3000, 0,
         'PENDING'::transactions_paymentstatus_enum, $5) RETURNING id`,
      [base.companyId, base.branchId, base.userId, customerId, `CUO-${randomUUID().slice(0, 8)}`],
    );
    const [{ id: installmentId }] = await ds.query(
      `INSERT INTO installments (company_id, "sourceType", "sourceTransactionId", "saleTransactionId", "installmentNumber",
         "totalInstallments", amount, "amountPaid", "dueDate", status, "payeeType", "payeeId")
       VALUES ($1, 'SALE', $2, $2, 1, 1, 3000, 0, now()::date, 'PENDING', 'CUSTOMER', $3) RETURNING id`,
      [base.companyId, saleId, customerId],
    );
    const pay = () =>
      asCompany(base, () =>
        ctx.app.get(InstallmentService).payInstallment(installmentId, {
          paymentMethod: 'CASH',
          cashHubId,
        } as any),
      );
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => pay()));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM transactions WHERE "relatedTransactionId"=$1 AND "transactionType"::text='PAYMENT_IN'`,
      [saleId],
    );
    expect(n).toBe(1);
    const [inst] = await ds.query(`SELECT "amountPaid"::float AS paid, status::text AS status FROM installments WHERE id=$1`, [
      installmentId,
    ]);
    expect(inst).toEqual({ paid: 3000, status: 'PAID' });
  });

  it('un pago parcial deja la cuota PARCIAL y el resto la completa; pagar de más se rechaza', async () => {
    const [{ id: customerId }] = await ds.query(`SELECT id FROM customers LIMIT 1`);
    const [{ id: cashHubId }] = await ds.query(`SELECT id FROM cash_hubs WHERE "companyId"=$1 LIMIT 1`, [
      base.companyId,
    ]);
    const [{ id: saleId }] = await ds.query(
      `INSERT INTO transactions ("transactionType", status, company_id, "branchId", "userId", "customerId",
         subtotal, total, "amountPaid", "paymentStatus", "documentNumber")
       VALUES ('SALE'::transactions_transactiontype_enum, 'CONFIRMED', $1, $2, $3, $4, 3000, 3000, 0,
         'PENDING'::transactions_paymentstatus_enum, $5) RETURNING id`,
      [base.companyId, base.branchId, base.userId, customerId, `CUO-${randomUUID().slice(0, 8)}`],
    );
    const [{ id: installmentId }] = await ds.query(
      `INSERT INTO installments (company_id, "sourceType", "sourceTransactionId", "saleTransactionId", "installmentNumber",
         "totalInstallments", amount, "amountPaid", "dueDate", status, "payeeType", "payeeId")
       VALUES ($1, 'SALE', $2, $2, 1, 1, 3000, 0, now()::date, 'PENDING', 'CUSTOMER', $3) RETURNING id`,
      [base.companyId, saleId, customerId],
    );
    const pay = (amount?: number) =>
      asCompany(base, () =>
        ctx.app.get(InstallmentService).payInstallment(installmentId, {
          paymentMethod: 'CASH',
          cashHubId,
          ...(amount != null ? { amount } : {}),
        } as any),
      );
    const state = async () =>
      (await ds.query(`SELECT "amountPaid"::float AS paid, status::text AS status FROM installments WHERE id=$1`, [installmentId]))[0];
    await pay(1000);
    expect(await state()).toEqual({ paid: 1000, status: 'PARTIAL' });
    await expect(pay(5000)).rejects.toThrow(/supera el saldo/);
    await pay();
    expect(await state()).toEqual({ paid: 3000, status: 'PAID' });
    await expect(pay()).rejects.toThrow(/inválido|supera/);
  });
});
