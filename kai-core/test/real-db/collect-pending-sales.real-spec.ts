import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { CashSessionCoreService } from '../../src/modules/cash-sessions/application/cash-session-core.service';
import { SalesFromSessionService } from '../../src/modules/cash-sessions/application/sales-from-session.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import { asCompany, BaseFixtures, loadBase } from './support/fixtures';

describe('Cobro de ventas pendientes (BD real)', () => {
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

  it('dos cobros simultáneos de la misma venta pendiente cobran una sola vez', async () => {
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
    const [{ id: saleId }] = await ds.query(
      `INSERT INTO transactions ("transactionType", status, company_id, "branchId", "userId", "customerId",
         subtotal, total, "amountPaid", "paymentStatus", "documentNumber")
       VALUES ('SALE'::transactions_transactiontype_enum, 'CONFIRMED', $1, $2, $3, $4, 5000, 5000, 0,
         'PENDING'::transactions_paymentstatus_enum, $5) RETURNING id`,
      [base.companyId, base.branchId, base.userId, customerId, `PEND-${randomUUID().slice(0, 8)}`],
    );
    const sales = ctx.app.get(SalesFromSessionService);
    const run = () =>
      asCompany(base, () =>
        sales.collectPendingSales({
          userName,
          pointOfSaleId: base.pointOfSaleId,
          cashSessionId,
          customerId,
          saleTransactionIds: [saleId],
          payments: [{ paymentMethod: 'CASH', amount: 5000 }],
        } as any),
      );
    const results = await Promise.allSettled([run(), run()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM transactions WHERE "cashSessionId"=$1 AND "transactionType"::text='PAYMENT_IN'
         AND metadata::jsonb->>'source'='pos_ar_collection'`,
      [cashSessionId],
    );
    expect(n).toBe(1);
  });

  it('si el cobro quedó a medias (pago registrado, venta sin actualizar) no se cobra de nuevo', async () => {
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
    const [{ id: saleId }] = await ds.query(
      `INSERT INTO transactions ("transactionType", status, company_id, "branchId", "userId", "customerId",
         subtotal, total, "amountPaid", "paymentStatus", "documentNumber")
       VALUES ('SALE'::transactions_transactiontype_enum, 'CONFIRMED', $1, $2, $3, $4, 3000, 3000, 0,
         'PENDING'::transactions_paymentstatus_enum, $5) RETURNING id`,
      [base.companyId, base.branchId, base.userId, customerId, `PEND-${randomUUID().slice(0, 8)}`],
    );
    const collect = () =>
      asCompany(base, () =>
        ctx.app.get(SalesFromSessionService).collectPendingSales({
          userName,
          pointOfSaleId: base.pointOfSaleId,
          cashSessionId,
          customerId,
          saleTransactionIds: [saleId],
          payments: [{ paymentMethod: 'CASH', amount: 3000 }],
        } as any),
      );
    await collect();
    // Simula el fallo del segundo paso: la venta vuelve a quedar pendiente
    await ds.query(
      `UPDATE transactions SET "amountPaid"=0, "paymentStatus"='PENDING'::transactions_paymentstatus_enum WHERE id=$1`,
      [saleId],
    );
    const again: any = await collect();
    expect(again.reconciled).toBe(true);
    const [sale] = await ds.query(
      `SELECT "amountPaid"::float AS paid, "paymentStatus"::text AS ps FROM transactions WHERE id=$1`,
      [saleId],
    );
    expect(sale).toEqual({ paid: 3000, ps: 'PAID' });
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM transactions WHERE "cashSessionId"=$1 AND "transactionType"::text='PAYMENT_IN'
         AND metadata::jsonb->>'source'='pos_ar_collection'`,
      [cashSessionId],
    );
    expect(n).toBe(1);
  });
});
