import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { CashSessionCoreService } from '../../src/modules/cash-sessions/application/cash-session-core.service';
import { DiningService } from '../../src/modules/dining/application/dining.service';
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

  async function taxedVariant() {
    const v = await stocked(1000);
    const taxId = randomUUID();
    await ds.query(
      `INSERT INTO taxes (id, "companyId", name, code, "taxType", rate, "isActive") VALUES ($1,$2,'IVA 19 prueba',$3,'IVA',19,true)`,
      [taxId, base.companyId, `IVA-${taxId.slice(0, 6)}`],
    );
    await ds.query(`UPDATE product_variants SET "taxIds"=$2::json WHERE id=$1`, [v.variantId, JSON.stringify([taxId])]);
    return v;
  }

  it('acepta una línea gravada con su IVA correcto', async () => {
    const v = await taxedVariant();
    const res = await sale(v.variantId, {
      lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: 1000, taxRate: 19, taxAmount: 190 }],
      payments: [{ paymentMethod: 'CASH', amount: 1190 }],
      amountPaid: 1190,
      changeAmount: 0,
    });
    expect(res.success).toBe(true);
    expect(Number(res.transaction.total)).toBe(1190);
  });

  it('rechaza una línea gravada con el impuesto en cero o reducido', async () => {
    const v = await taxedVariant();
    for (const taxAmount of [0, 50]) {
      await expect(
        sale(v.variantId, {
          lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: 1000, taxRate: 19, taxAmount }],
          payments: [{ paymentMethod: 'CASH', amount: 1000 + taxAmount }],
          amountPaid: 1000 + taxAmount,
          changeAmount: 0,
        }),
      ).rejects.toThrow(/impuesto de la línea/);
    }
  });

  async function diningOrder() {
    const [{ id }] = await ds.query(
      `INSERT INTO dining_orders (company_id, branch_id, kind, display_label, status)
       VALUES ($1, $2, 'COUNTER', 'Cuenta prueba', 'OPEN') RETURNING id`,
      [base.companyId, base.branchId],
    );
    return id as string;
  }

  it('una cuenta del salón no se puede cobrar dos veces y solo se cierra con su propia venta', async () => {
    const v = await stocked(1000);
    const orderId = await diningOrder();
    const charge = () =>
      sale(v.variantId, {
        metadata: { clientOperationId: randomUUID(), diningOrderId: orderId },
        payments: [{ paymentMethod: 'CASH', amount: 1000 }],
        amountPaid: 1000,
        changeAmount: 0,
      });
    const first = await charge();
    expect(first.success).toBe(true);
    await expect(charge()).rejects.toThrow(/ya tiene una venta vigente/);

    const dining = ctx.app.get(DiningService);
    await expect(
      asCompany(base, () => dining.closeDiningOrder(orderId, randomUUID())),
    ).rejects.toThrow(/no existe/);
    const closed = await asCompany(base, () =>
      dining.closeDiningOrder(orderId, first.transaction.id),
    );
    expect(closed.status).toBe('CLOSED');
    await expect(charge()).rejects.toThrow(/ya fue cobrada/);
  });
});
