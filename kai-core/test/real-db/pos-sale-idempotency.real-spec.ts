import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { CashSessionCoreService } from '../../src/modules/cash-sessions/application/cash-session-core.service';
import { SalesFromSessionService } from '../../src/modules/cash-sessions/application/sales-from-session.service';
import { ReceptionsService } from '../../src/modules/receptions/application/receptions.service';
import { PosSyncService } from '../../src/modules/pos-sync/application/pos-sync.service';
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

describe('Venta POS: idempotencia y sincronización offline (BD real)', () => {
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
    const opened: any = await asCompany(base, () =>
      ctx.app.get(CashSessionCoreService).open({
        userId: base.userId,
        userName,
        pointOfSaleId: base.pointOfSaleId,
        openingAmount: 0,
      } as any),
    );
    cashSessionId = opened.id ?? opened.cashSession?.id ?? opened.session?.id;
    expect(cashSessionId).toBeDefined();
  });
  afterAll(async () => {
    await ctx?.close();
  });

  const saleBody = (v: { variantId: string }, extra: Record<string, unknown> = {}) => ({
    userName,
    pointOfSaleId: base.pointOfSaleId,
    cashSessionId,
    paymentMethod: 'CASH',
    lines: [{ productVariantId: v.variantId, quantity: 2, unitPrice: 500 }],
    payments: [{ paymentMethod: 'CASH', amount: 1000 }],
    amountPaid: 1000,
    changeAmount: 0,
    ...extra,
  });

  it('reintentar la misma venta online (mismo clientOperationId) no la duplica', async () => {
    const v = await createPhysicalVariant(ds, base, { basePrice: 500 });
    const supplierId = await createSupplier(ds, base);
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `ID-${v.sku}`,
        documentType: 'factura',
        lines: [{ productVariantId: v.variantId, receivedQuantity: 10, unitPrice: 100, unitCost: 100 }],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 10);
    const sales = ctx.app.get(SalesFromSessionService);
    const op = randomUUID();
    const a: any = await asCompany(base, () =>
      sales.createSale(saleBody(v, { metadata: { clientOperationId: op } }) as any),
    );
    const b: any = await asCompany(base, () =>
      sales.createSale(saleBody(v, { metadata: { clientOperationId: op } }) as any),
    );
    expect(a.success).toBe(true);
    expect(b.transaction.id).toBe(a.transaction.id);
    expect(b.deduplicated).toBe(true);
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM transactions WHERE metadata::jsonb->>'clientOperationId'=$1`,
      [op],
    );
    expect(n).toBe(1);
    await waitForStock(ds, v.variantId, base.storageId, 8);
    expect(await physicalStock(ds, v.variantId, base.storageId)).toBe(8);
  });

  it('una venta offline sin stock se sincroniza igual (stock negativo) y reenviarla no la duplica', async () => {
    const v = await createPhysicalVariant(ds, base, { basePrice: 500 });
    const sync = ctx.app.get(PosSyncService);
    const op = randomUUID();
    const cmd = {
      clientOperationId: op,
      deviceId: 'device-test',
      commandType: 'SALE',
      userName,
      pointOfSaleId: base.pointOfSaleId,
      cashSessionId,
      paymentMethod: 'CASH',
      lines: [{ productVariantId: v.variantId, quantity: 2, unitPrice: 500 }],
      payments: [{ paymentMethod: 'CASH', amount: 1000 }],
      amountPaid: 1000,
      changeAmount: 0,
    };
    const r1: any = await asCompany(base, () => sync.syncCommand(cmd));
    expect(r1.success).toBe(true);
    await waitForStock(ds, v.variantId, base.storageId, -2);
    const r2: any = await asCompany(base, () => sync.syncCommand(cmd));
    expect(r2.transactionId).toBe(r1.transactionId);
    expect(await physicalStock(ds, v.variantId, base.storageId)).toBe(-2);
  });

  it('una sincronización fallida se vuelve a procesar al reintentar (no queda cacheada)', async () => {
    const v = await createPhysicalVariant(ds, base, { basePrice: 500 });
    const sync = ctx.app.get(PosSyncService);
    const op = randomUUID();
    const cmd = {
      clientOperationId: op,
      deviceId: 'device-test',
      commandType: 'SALE',
      userName: 'usuario-que-no-existe',
      pointOfSaleId: base.pointOfSaleId,
      cashSessionId,
      paymentMethod: 'CASH',
      lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: 500 }],
      payments: [{ paymentMethod: 'CASH', amount: 500 }],
      amountPaid: 500,
      changeAmount: 0,
    };
    const fail: any = await asCompany(base, () => sync.syncCommand(cmd));
    expect(fail.success).toBe(false);
    const ok: any = await asCompany(base, () => sync.syncCommand({ ...cmd, userName }));
    expect(ok.success).toBe(true);
  });

  it('el servidor rechaza líneas con cantidad/precio/descuento inválidos y no acepta el costo del cliente', async () => {
    const { validate } = await import('class-validator');
    const { plainToInstance } = await import('class-transformer');
    const { SaleLineDto } = await import('../../src/modules/cash-sessions/application/dto/create-sale.dto');
    const errs = async (o: Record<string, unknown>) =>
      (await validate(plainToInstance(SaleLineDto, { productVariantId: 'v', quantity: 1, unitPrice: 10, ...o }))).length;
    expect(await errs({})).toBe(0);
    expect(await errs({ quantity: -3 })).toBeGreaterThan(0);
    expect(await errs({ quantity: 0 })).toBeGreaterThan(0);
    expect(await errs({ unitPrice: -1 })).toBeGreaterThan(0);
    expect(await errs({ discountAmount: -5 })).toBeGreaterThan(0);
    expect(await errs({ taxAmount: -1 })).toBeGreaterThan(0);

    // Descuento mayor al subtotal: rechazado por el servicio
    const v = await createPhysicalVariant(ds, base, { basePrice: 500 });
    const sales = ctx.app.get(SalesFromSessionService);
    await expect(
      asCompany(base, () =>
        sales.createSale(
          saleBody(v, {
            lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: 500, discountAmount: 900 }],
          }) as any,
        ),
      ),
    ).rejects.toThrow(/descuento/i);

    // Costo enviado por el cliente se ignora: queda el costo del servidor
    await ds.query(`UPDATE product_variants SET pmp=70 WHERE id=$1`, [v.variantId]);
    const r: any = await asCompany(base, () =>
      ctx.app.get(PosSyncService).syncCommand({
        clientOperationId: randomUUID(),
        deviceId: 'device-test',
        commandType: 'SALE',
        userName,
        pointOfSaleId: base.pointOfSaleId,
        cashSessionId,
        paymentMethod: 'CASH',
        lines: [{ productVariantId: v.variantId, quantity: 1, unitPrice: 500, unitCost: 1 }],
        payments: [{ paymentMethod: 'CASH', amount: 500 }],
        amountPaid: 500,
        changeAmount: 0,
      }),
    );
    expect(r.success).toBe(true);
    const [l] = await ds.query(
      `SELECT "unitCost"::float AS c FROM transaction_lines WHERE "transactionId"=$1`,
      [r.transactionId],
    );
    expect(l.c).toBe(70);
  });
});
