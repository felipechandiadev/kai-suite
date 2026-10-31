import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { CashSessionCoreService } from '../../src/modules/cash-sessions/application/cash-session-core.service';
import { SalesFromSessionService } from '../../src/modules/cash-sessions/application/sales-from-session.service';
import { ReceptionsService } from '../../src/modules/receptions/application/receptions.service';
import { TransactionsService } from '../../src/modules/transactions/application/transactions.service';
import { VoidSaleService } from '../../src/modules/transactions/application/void-sale.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import {
  asCompany,
  BaseFixtures,
  createPhysicalVariant,
  createSupplier,
  loadBase,
  waitForStock,
} from './support/fixtures';

describe('Cierre de caja (BD real)', () => {
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

  async function openSession() {
    // La BD demo puede traer una sesión abierta en este POS: se cierra para aislar la prueba.
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
    return (opened.id ?? opened.cashSession?.id ?? opened.session?.id) as string;
  }

  async function sell(cashSessionId: string, amount: number) {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { basePrice: amount });
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `CL-${v.sku}`,
        documentType: 'factura',
        lines: [{ productVariantId: v.variantId, receivedQuantity: 5, unitPrice: 10, unitCost: 10 }],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 5);
    const res: any = await asCompany(base, () =>
      ctx.app.get(SalesFromSessionService).createSale({
        userName,
        pointOfSaleId: base.pointOfSaleId,
        cashSessionId,
        paymentMethod: 'CASH',
        lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: amount }],
        payments: [{ paymentMethod: 'CASH', amount }],
        amountPaid: amount,
        changeAmount: 0,
        metadata: { clientOperationId: randomUUID() },
      } as any),
    );
    expect(res.success).toBe(true);
    return res.transaction.id as string;
  }

  const closings = async (sessionId: string) =>
    Number(
      (
        await ds.query(
          `SELECT COUNT(*)::int AS n FROM transactions WHERE "cashSessionId"=$1 AND "transactionType"::text='CASH_SESSION_CLOSING'`,
          [sessionId],
        )
      )[0].n,
    );

  it('el total de ventas de la sesión es numérico y excluye ventas anuladas', async () => {
    const sessionId = await openSession();
    await sell(sessionId, 1000);
    const toVoid = await sell(sessionId, 400);
    await asCompany(base, () =>
      ctx.app.get(VoidSaleService).void(base.companyId, base.userId, toVoid, {
        reason: 'Prueba cierre',
      } as any),
    );
    const total = await asCompany(base, () =>
      ctx.app.get(TransactionsService).getTotalSalesForSession(sessionId),
    );
    expect(total).toBe(1000);
  });

  it('cierra con arqueo: una sola transacción de cierre y diferencia calculada', async () => {
    const sessionId = await openSession();
    await sell(sessionId, 1000);
    const res: any = await asCompany(base, () =>
      ctx.app.get(CashSessionCoreService).close(sessionId, base.userId, {
        counted: { cash: 900 } as any,
      }),
    );
    expect(res.success).toBe(true);
    expect(res.salesTotal).toBe(1000);
    expect(res.difference).toBe(-100);
    expect(await closings(sessionId)).toBe(1);
  });

  it('dos cierres simultáneos crean un solo cierre', async () => {
    const sessionId = await openSession();
    await sell(sessionId, 1000);
    const core = ctx.app.get(CashSessionCoreService);
    const run = () =>
      asCompany(base, () => core.close(sessionId, base.userId, { counted: { cash: 1000 } as any }));
    const results = await Promise.allSettled([run(), run()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await closings(sessionId)).toBe(1);
  });

  it('sin conteo físico se cierra con el efectivo esperado (no con el total de ventas)', async () => {
    const sessionId = await openSession();
    await sell(sessionId, 1000);
    const res: any = await asCompany(base, () =>
      ctx.app.get(CashSessionCoreService).close(sessionId, base.userId, {}),
    );
    expect(res.success).toBe(true);
    expect(res.expectedAmount).toBe(1000);
    expect(res.usedBlindCount).toBe(false);
    const [closing] = await ds.query(
      `SELECT total::float AS total FROM transactions WHERE "cashSessionId"=$1 AND "transactionType"::text='CASH_SESSION_CLOSING'`,
      [sessionId],
    );
    expect(closing.total).toBe(1000);
  });
});
