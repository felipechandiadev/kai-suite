import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { CashSessionsService } from '../../src/modules/cash-sessions/application/cash-sessions.service';
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

describe('Retiros y depósitos de caja chica (BD real)', () => {
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

  async function sessionWithCash() {
    await ds.query(
      `UPDATE cash_sessions SET status='CLOSED' WHERE "pointOfSaleId"=$1 AND status::text='OPEN'`,
      [base.pointOfSaleId],
    );
    const core = ctx.app.get(CashSessionCoreService);
    const opened: any = await asCompany(base, () =>
      core.open({ userId: base.userId, userName, pointOfSaleId: base.pointOfSaleId, openingAmount: 0 } as any),
    );
    const sessionId = (opened.id ?? opened.cashSession?.id ?? opened.session?.id) as string;
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { basePrice: 1000 });
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `CM-${v.sku}`,
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
    return sessionId;
  }

  const withdraw = (sessionId: string, amount: number, opts?: { skipBalanceCheck?: boolean }) =>
    asCompany(base, () =>
      ctx.app.get(CashSessionsService).registerCashWithdrawal(
        { userName, pointOfSaleId: base.pointOfSaleId, cashSessionId: sessionId, amount, reason: 'prueba' },
        opts,
      ),
    );

  it('un retiro mayor al efectivo disponible se rechaza; el sync offline sí lo registra', async () => {
    const sessionId = await sessionWithCash();
    await expect(withdraw(sessionId, 1500)).rejects.toThrow(/Efectivo insuficiente/);
    const synced: any = await withdraw(sessionId, 1500, { skipBalanceCheck: true });
    expect(synced.success).toBe(true);
  });

  it('retiros simultáneos: solo pasan los que caben en el efectivo disponible', async () => {
    const sessionId = await sessionWithCash();
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => withdraw(sessionId, 400)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
  });

  it('no se registran movimientos en una sesión cerrada', async () => {
    const sessionId = await sessionWithCash();
    await asCompany(base, () =>
      ctx.app.get(CashSessionCoreService).close(sessionId, base.userId, { counted: { cash: 1000 } as any }),
    );
    await expect(withdraw(sessionId, 100)).rejects.toThrow(/no se pueden registrar operaciones/);
    await expect(
      asCompany(base, () =>
        ctx.app.get(CashSessionsService).registerCashDeposit({
          userName,
          pointOfSaleId: base.pointOfSaleId,
          cashSessionId: sessionId,
          amount: 100,
        }),
      ),
    ).rejects.toThrow(/no se pueden registrar operaciones/);
  });
});
