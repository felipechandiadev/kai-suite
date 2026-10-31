import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { CashSessionCoreService } from '../../src/modules/cash-sessions/application/cash-session-core.service';
import { SalesFromSessionService } from '../../src/modules/cash-sessions/application/sales-from-session.service';
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

describe('Retiros de caja al centro de efectivo (BD real)', () => {
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

  it('retiros simultáneos que superan el efectivo disponible: solo pasan los que caben', async () => {
    await ds.query(
      `UPDATE cash_sessions SET status='CLOSED' WHERE "pointOfSaleId"=$1 AND status::text='OPEN'`,
      [base.pointOfSaleId],
    );
    const core = ctx.app.get(CashSessionCoreService);
    const opened: any = await asCompany(base, () =>
      core.open({
        userId: base.userId,
        userName,
        pointOfSaleId: base.pointOfSaleId,
        openingAmount: 0,
      } as any),
    );
    const sessionId = (opened.id ?? opened.cashSession?.id ?? opened.session?.id) as string;

    // Efectivo disponible: una venta de 1000
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { basePrice: 1000 });
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `HUB-${v.sku}`,
        documentType: 'factura',
        lines: [{ productVariantId: v.variantId, receivedQuantity: 3, unitPrice: 10, unitCost: 10 }],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 3);
    await asCompany(base, () =>
      ctx.app.get(SalesFromSessionService).createSale({
        userName,
        pointOfSaleId: base.pointOfSaleId,
        cashSessionId: sessionId,
        paymentMethod: 'CASH',
        lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: 1000 }],
        payments: [{ paymentMethod: 'CASH', amount: 1000 }],
        amountPaid: 1000,
        changeAmount: 0,
        metadata: { clientOperationId: randomUUID() },
      } as any),
    );

    const [{ id: cashHubId }] = await ds.query(`SELECT id FROM cash_hubs WHERE "companyId"=$1 LIMIT 1`, [
      base.companyId,
    ]);
    const withdraw = () =>
      asCompany(base, () =>
        core.withdrawCashSessionToHub({
          cashSessionId: sessionId,
          cashHubId,
          amount: 300,
          userId: base.userId,
          reason: 'prueba',
        }),
      );
    // 8 retiros simultáneos de 300 contra 1000 disponibles: pueden pasar a lo sumo 3.
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => withdraw()));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM transactions WHERE "cashSessionId"=$1 AND "transactionType"::text='CASH_SESSION_TO_HUB_TRANSFER'`,
      [sessionId],
    );
    expect(n).toBe(3);
  });
});
