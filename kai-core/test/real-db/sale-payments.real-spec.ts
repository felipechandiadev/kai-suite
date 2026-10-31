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

describe('Venta POS: pagos vs total (BD real)', () => {
  let ctx: RealDbContext;
  let ds: DataSource;
  let base: BaseFixtures;
  let userName: string;
  let cashSessionId: string;

  beforeAll(async () => {
    ctx = await bootRealDb();
    ds = ctx.app.get(DataSource);
    base = await loadBase(ds);
    [{ userName }] = await ds.query(`SELECT "userName" FROM users WHERE id=$1`, [base.userId]);
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

  async function stocked(price: number) {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { basePrice: price });
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `SP-${v.sku}`,
        documentType: 'factura',
        lines: [{ productVariantId: v.variantId, receivedQuantity: 10, unitPrice: 10, unitCost: 10 }],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 10);
    return v;
  }

  const sale = (variantId: string, body: Record<string, unknown>) =>
    asCompany(base, () =>
      ctx.app.get(SalesFromSessionService).createSale({
        userName,
        pointOfSaleId: base.pointOfSaleId,
        cashSessionId,
        paymentMethod: 'CASH',
        lines: [{ productVariantId: variantId, quantity: 1, unitPrice: 1000 }],
        metadata: { clientOperationId: randomUUID() },
        ...body,
      } as any),
    ) as Promise<any>;

  it('rechaza una venta cuyos pagos no cubren el total aunque amountPaid diga lo contrario', async () => {
    const v = await stocked(1000);
    await expect(
      sale(v.variantId, {
        payments: [{ paymentMethod: 'CASH', amount: 100 }],
        amountPaid: 1000,
        changeAmount: 0,
      }),
    ).rejects.toThrow(/menor al total de la venta/);
  });

  it('acepta pago exacto y pago en efectivo con vuelto', async () => {
    const v = await stocked(1000);
    const exact = await sale(v.variantId, {
      payments: [{ paymentMethod: 'CASH', amount: 1000 }],
      amountPaid: 1000,
      changeAmount: 0,
    });
    expect(exact.success).toBe(true);
    const withChange = await sale(v.variantId, {
      payments: [{ paymentMethod: 'CASH', amount: 1500 }],
      amountPaid: 1500,
      changeAmount: 500,
    });
    expect(withChange.success).toBe(true);
  });

  it('acepta pagos combinados que suman el total', async () => {
    const v = await stocked(1000);
    const res = await sale(v.variantId, {
      payments: [
        { paymentMethod: 'CASH', amount: 400 },
        { paymentMethod: 'TRANSFER', amount: 600 },
      ],
      amountPaid: 1000,
      changeAmount: 0,
    });
    expect(res.success).toBe(true);
  });

  it('rechaza un descuento suelto en la línea que no proviene de una promoción', async () => {
    const v = await stocked(1000);
    await expect(
      sale(v.variantId, {
        lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: 1000, discountAmount: 900 }],
        payments: [{ paymentMethod: 'CASH', amount: 100 }],
        amountPaid: 100,
        changeAmount: 0,
      }),
    ).rejects.toThrow(/promoci/i);
  });
});
