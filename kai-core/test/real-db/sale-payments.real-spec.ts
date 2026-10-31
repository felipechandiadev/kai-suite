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

  it('un ticket de preventa cobrado en simultáneo en varias cajas se canjea una sola vez', async () => {
    const v = await stocked(1000);
    await ds.query(
      `UPDATE points_of_sale SET settings = (COALESCE(settings::jsonb, '{}'::jsonb) || '{"kind":"SALE","acceptsPresaleTickets":true}'::jsonb)::json WHERE id=$1`,
      [base.pointOfSaleId],
    );
    const [{ pc }] = await ds.query(`SELECT 'PT' || substr(md5(random()::text), 1, 8) AS pc`);
    const [{ id: ticketId }] = await ds.query(
      `INSERT INTO presale_tickets (company_id, code, status, presale_point_of_sale_id, branch_id, price_list_id, total)
       VALUES ($1, $2, 'READY', $3, $4, (SELECT id FROM price_lists WHERE company_id=$1 LIMIT 1), 1000) RETURNING id`,
      [base.companyId, pc, base.pointOfSaleId, base.branchId],
    );
    const charge = () =>
      sale(v.variantId, {
        fulfillPresaleTicketIds: [ticketId],
        metadata: { clientOperationId: randomUUID() },
        payments: [{ paymentMethod: 'CASH', amount: 1000 }],
        amountPaid: 1000,
        changeAmount: 0,
      });
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => charge()));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [t] = await ds.query(`SELECT status::text AS status FROM presale_tickets WHERE id=$1`, [ticketId]);
    expect(t.status).toBe('REDEEMED');
  });

  it('una nota de crédito usada como medio de pago en ventas simultáneas se consume una sola vez', async () => {
    const [{ id: customerId }] = await ds.query(`SELECT id FROM customers LIMIT 1`);
    const [{ id: ncId }] = await ds.query(
      `INSERT INTO transactions ("transactionType", status, company_id, "branchId", "userId", "customerId",
         subtotal, total, "amountPaid", "documentNumber", metadata)
       VALUES ('CUSTOMER_CREDIT_NOTE'::transactions_transactiontype_enum, 'CONFIRMED', $1, $2, $3, $4, 1000, 1000, 0, $5, $6::json)
       RETURNING id`,
      [
        base.companyId,
        base.branchId,
        base.userId,
        customerId,
        `NC-${randomUUID().slice(0, 8)}`,
        JSON.stringify({ origin: 'CUSTOMER_CREDIT_NOTE' }),
      ],
    );
    const variants: Array<Awaited<ReturnType<typeof stocked>>> = [];
    for (let i = 0; i < 6; i++) variants.push(await stocked(1000));
    const results = await Promise.allSettled(
      variants.map((v) =>
        sale(v.variantId, {
          customerId,
          metadata: { clientOperationId: randomUUID() },
          payments: [
            { paymentMethod: 'CUSTOMER_CREDIT_NOTE', amount: 1000, creditNoteTransactionId: ncId },
          ],
          amountPaid: 1000,
          changeAmount: 0,
        }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [nc] = await ds.query(`SELECT metadata FROM transactions WHERE id=$1`, [ncId]);
    expect(nc.metadata.creditNote.consumedAmount).toBe(1000);
  });
});
