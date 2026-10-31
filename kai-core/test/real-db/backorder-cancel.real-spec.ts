import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { CashSessionCoreService } from '../../src/modules/cash-sessions/application/cash-session-core.service';
import { SalesFromSessionService } from '../../src/modules/cash-sessions/application/sales-from-session.service';
import { CancelBackorderService } from '../../src/modules/transactions/application/cancel-backorder.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import { asCompany, BaseFixtures, createPhysicalVariant, loadBase } from './support/fixtures';

describe('Anulación de encargo (BD real)', () => {
  let ctx: RealDbContext;
  let ds: DataSource;
  let base: BaseFixtures;
  let userName: string;

  beforeAll(async () => {
    ctx = await bootRealDb();
    ds = ctx.app.get(DataSource);
    base = await loadBase(ds);
    [{ userName }] = await ds.query(`SELECT "userName" FROM users WHERE id=$1`, [base.userId]);
  });
  afterAll(async () => {
    await ctx?.close();
  });

  it('anulaciones simultáneas del mismo encargo emiten una sola nota de crédito', async () => {
    await ds.query(
      `UPDATE cash_sessions SET status='CLOSED' WHERE "pointOfSaleId"=$1 AND status::text='OPEN'`,
      [base.pointOfSaleId],
    );
    const opened: any = await asCompany(base, () =>
      ctx.app.get(CashSessionCoreService).open({
        userId: base.userId,
        userName,
        pointOfSaleId: base.pointOfSaleId,
        openingAmount: 0,
      } as any),
    );
    const cashSessionId = (opened.id ?? opened.cashSession?.id ?? opened.session?.id) as string;
    const [{ id: customerId }] = await ds.query(`SELECT id FROM customers LIMIT 1`);
    const v = await createPhysicalVariant(ds, base, { basePrice: 2000 });

    const created: any = await asCompany(base, () =>
      ctx.app.get(SalesFromSessionService).createBackorder({
        userName,
        pointOfSaleId: base.pointOfSaleId,
        cashSessionId,
        customerId,
        paymentMethod: 'CASH',
        lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: 2000 }],
        payments: [{ paymentMethod: 'CASH', amount: 500 }],
        amountPaid: 500,
        changeAmount: 0,
        backorderDepositAmount: 500,
        metadata: { clientOperationId: randomUUID() },
      } as any),
    );
    expect(created.success).toBe(true);
    const backorderId = created.transaction.id as string;

    const cancel = () =>
      asCompany(base, () =>
        ctx.app.get(CancelBackorderService).cancel(base.companyId, base.userId, backorderId, {
          reason: 'Prueba',
        } as any),
      );
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => cancel()));
    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok.length).toBeGreaterThanOrEqual(1);
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM transactions WHERE "relatedTransactionId"=$1 AND "transactionType"::text='CUSTOMER_CREDIT_NOTE'`,
      [backorderId],
    );
    expect(n).toBe(1);
  });
});
