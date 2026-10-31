import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { CommandBus } from '@nestjs/cqrs';
import { CompletePaymentCommand } from '../../src/modules/transactions/application/commands/complete-payment.usecase';
import { bootRealDb, RealDbContext } from './support/app-context';
import { asCompany, BaseFixtures, createSupplier, loadBase } from './support/fixtures';

describe('Pago a proveedor (BD real)', () => {
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

  it('completar el mismo pago varias veces a la vez registra una sola ejecución de pago', async () => {
    const supplierId = await createSupplier(ds, base);
    const [{ id: paymentId }] = await ds.query(
      `INSERT INTO transactions ("transactionType", status, company_id, "branchId", "userId", "supplierId",
         subtotal, total, "amountPaid", "paymentMethod", "documentNumber")
       VALUES ('SUPPLIER_PAYMENT'::transactions_transactiontype_enum, 'PENDING', $1, $2, $3, $4, 5000, 5000, 0,
         'TRANSFER'::transactions_paymentmethod_enum, $5) RETURNING id`,
      [base.companyId, base.branchId, base.userId, supplierId, `PP-${randomUUID().slice(0, 8)}`],
    );
    const complete = () =>
      asCompany(base, () =>
        ctx.app.get(CommandBus).execute(new CompletePaymentCommand(paymentId, { paymentMethod: 'TRANSFER' })),
      );
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => complete()));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM transactions WHERE "relatedTransactionId"=$1 AND "transactionType"::text='PAYMENT_EXECUTION'`,
      [paymentId],
    );
    expect(n).toBe(1);
  });
});
