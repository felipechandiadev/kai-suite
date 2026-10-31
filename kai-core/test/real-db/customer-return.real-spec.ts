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
  waitForStock,
} from './support/fixtures';

describe('Devolución de cliente (BD real)', () => {
  let ctx: RealDbContext;
  let ds: DataSource;
  let base: BaseFixtures;
  let userName: string;
  let cashSessionId: string;
  let customerId: string;

  beforeAll(async () => {
    ctx = await bootRealDb();
    ds = ctx.app.get(DataSource);
    base = await loadBase(ds);
    [{ userName }] = await ds.query(`SELECT "userName" FROM users WHERE id=$1`, [base.userId]);
    [{ id: customerId }] = await ds.query(`SELECT id FROM customers LIMIT 1`);
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
    cashSessionId = (opened.id ?? opened.cashSession?.id ?? opened.session?.id) as string;
  });
  afterAll(async () => {
    await ctx?.close();
  });

  async function soldSale(qty: number, unitPrice: number) {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { basePrice: unitPrice });
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `RT-${v.sku}`,
        documentType: 'factura',
        lines: [{ productVariantId: v.variantId, receivedQuantity: 10, unitPrice: 10, unitCost: 10 }],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 10);
    const res: any = await asCompany(base, () =>
      ctx.app.get(SalesFromSessionService).createSale({
        userName,
        pointOfSaleId: base.pointOfSaleId,
        cashSessionId,
        paymentMethod: 'CASH',
        lines: [{ productVariantId: v.variantId, quantity: qty, unitPrice }],
        payments: [{ paymentMethod: 'CASH', amount: qty * unitPrice }],
        amountPaid: qty * unitPrice,
        changeAmount: 0,
        metadata: { clientOperationId: randomUUID() },
      } as any),
    );
    expect(res.success).toBe(true);
    return { saleId: res.transaction.id as string, variantId: v.variantId };
  }

  const returnDto = (saleId: string, variantId: string, quantity: number, unitPrice: number) => ({
    originalSaleId: saleId,
    customerId,
    pointOfSaleId: base.pointOfSaleId,
    cashSessionId,
    userName,
    paymentMethod: 'CASH',
    amountPaid: 0,
    changeAmount: 0,
    lines: [{ productVariantId: variantId, quantity, unitPrice }],
  });

  it('rechaza una devolución a un precio mayor al pagado en la venta', async () => {
    const { saleId, variantId } = await soldSale(2, 1000);
    await expect(
      asCompany(base, () =>
        ctx.app.get(SalesFromSessionService).confirmCustomerReturnWithCreditNote(
          returnDto(saleId, variantId, 1, 9000) as any,
        ),
      ),
    ).rejects.toThrow(/excede lo pagado/);
  });

  it('seis devoluciones simultáneas de la única unidad vendida: solo una se acepta', async () => {
    const { saleId, variantId } = await soldSale(1, 1000);
    const run = () =>
      asCompany(base, () =>
        ctx.app.get(SalesFromSessionService).confirmCustomerReturnWithCreditNote(
          returnDto(saleId, variantId, 1, 1000) as any,
        ),
      );
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => run()));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM transactions WHERE "relatedTransactionId"=$1 AND "transactionType"::text='SALE_RETURN'`,
      [saleId],
    );
    expect(n).toBe(1);
  });

  it('no permite devolver una venta anulada', async () => {
    const { saleId, variantId } = await soldSale(1, 1000);
    await asCompany(base, () =>
      ctx.app.get(VoidSaleService).void(base.companyId, base.userId, saleId, {
        reason: 'Prueba devolución',
      } as any),
    );
    await expect(
      asCompany(base, () =>
        ctx.app.get(SalesFromSessionService).confirmCustomerReturnWithCreditNote(
          returnDto(saleId, variantId, 1, 1000) as any,
        ),
      ),
    ).rejects.toThrow(/anulada/);
  });

  it('una devolución legítima por el precio pagado sigue funcionando', async () => {
    const { saleId, variantId } = await soldSale(2, 1000);
    const res: any = await asCompany(base, () =>
      ctx.app.get(SalesFromSessionService).confirmCustomerReturnWithCreditNote(
        returnDto(saleId, variantId, 1, 1000) as any,
      ),
    );
    expect(res.success).toBe(true);
    expect(res.creditNote.total).toBe(1000);
  });
});
