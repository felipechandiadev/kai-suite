import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { CashSessionCoreService } from '../../src/modules/cash-sessions/application/cash-session-core.service';
import { SalesFromSessionService } from '../../src/modules/cash-sessions/application/sales-from-session.service';
import { ReceptionsService } from '../../src/modules/receptions/application/receptions.service';
import { VoidSaleService } from '../../src/modules/transactions/application/void-sale.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import {
  asCompany,
  BaseFixtures,
  createPhysicalVariant,
  createSupplier,
  loadBase,
  physicalStock,
  waitForStock,
} from './support/fixtures';

describe('Anulación de venta simultánea (BD real)', () => {
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

  it('varias anulaciones simultáneas de la misma venta restituyen el stock una sola vez', async () => {
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
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { basePrice: 1000 });
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `VV-${v.sku}`,
        documentType: 'factura',
        lines: [{ productVariantId: v.variantId, receivedQuantity: 10, unitPrice: 10, unitCost: 10 }],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 10);
    const sale: any = await asCompany(base, () =>
      ctx.app.get(SalesFromSessionService).createSale({
        userName,
        pointOfSaleId: base.pointOfSaleId,
        cashSessionId,
        paymentMethod: 'CASH',
        lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: 1000 }],
        payments: [{ paymentMethod: 'CASH', amount: 1000 }],
        amountPaid: 1000,
        changeAmount: 0,
        metadata: { clientOperationId: randomUUID() },
      } as any),
    );
    await waitForStock(ds, v.variantId, base.storageId, 9);

    const voidIt = () =>
      asCompany(base, () =>
        ctx.app.get(VoidSaleService).void(base.companyId, base.userId, sale.transaction.id, {
          reason: 'Prueba concurrente',
        } as any),
      );
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => voidIt()));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await waitForStock(ds, v.variantId, base.storageId, 10);
    await new Promise((r) => setTimeout(r, 400)); // por si llegara un segundo ajuste tardío
    expect(await physicalStock(ds, v.variantId, base.storageId)).toBe(10);
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM transactions WHERE "relatedTransactionId"=$1 AND "transactionType"::text IN ('ADJUSTMENT_IN','VOID_ADJUSTMENT')`,
      [sale.transaction.id],
    );
    expect(n).toBe(2); // un ajuste de stock y un VOID_ADJUSTMENT
  });
});
