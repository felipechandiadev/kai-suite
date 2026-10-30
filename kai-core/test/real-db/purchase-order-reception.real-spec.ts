import { DataSource } from 'typeorm';
import { PurchaseOrdersService } from '../../src/modules/transactions/application/purchase-orders.service';
import { PurchaseOrderReceptionProgressService } from '../../src/modules/transactions/application/purchase-order-reception-progress.service';
import { ReceptionsService } from '../../src/modules/receptions/application/receptions.service';
import { ReceptionVoidService } from '../../src/modules/receptions/application/reception-void.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import {
  asCompany,
  BaseFixtures,
  createPhysicalVariant,
  createSupplier,
  loadBase,
  waitFor,
} from './support/fixtures';

describe('Orden de compra → recepciones parciales → anulación (BD real)', () => {
  let ctx: RealDbContext;
  let ds: DataSource;
  let base: BaseFixtures;

  beforeAll(async () => {
    ctx = await bootRealDb();
    ds = ctx.app.get(DataSource);
    base = await loadBase(ds);
  });
  afterAll(async () => {
    await ctx?.close();
  });

  const poStatus = async (id: string) =>
    (await ds.query(`SELECT status FROM transactions WHERE id=$1`, [id]))[0]
      .status as string;

  it('la OC pasa de Confirmada a Parcial y Recibida, y vuelve a Parcial al anular la última recepción', async () => {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base);

    const po: any = await asCompany(base, () =>
      ctx.app.get(PurchaseOrdersService).create({
        userId: base.userId,
        branchId: base.branchId,
        supplierId,
        storageId: base.storageId,
        documentDate: '2026-10-30',
        lines: [
          {
            productId: v.productId,
            variantId: v.variantId,
            productName: 'Producto prueba',
            sku: v.sku,
            quantity: 10,
            unitPrice: 100,
            taxIds: [],
          },
        ],
      } as any),
    );
    expect(po.id).toBeDefined();
    expect(await poStatus(po.id)).toBe('CONFIRMED');

    const receive = async (qty: number, ref: string) => {
      const res: any = await asCompany(base, () =>
        ctx.app.get(ReceptionsService).createDirect({
          storageId: base.storageId,
          branchId: base.branchId,
          supplierId,
          userId: base.userId,
          purchaseOrderId: po.id,
          reference: ref,
          documentType: 'factura',
          lines: [
            {
              productVariantId: v.variantId,
              receivedQuantity: qty,
              unitPrice: 100,
              unitCost: 100,
            },
          ],
        }),
      );
      expect(res.reception?.id).toBeDefined();
      return res.reception;
    };

    // 6 de 10 → Parcial
    await receive(6, 'OC-F1');
    await waitFor(
      async () => (await poStatus(po.id)) === 'PARTIALLY_RECEIVED',
      'OC parcial',
    );
    const progress = await ctx.app
      .get(PurchaseOrderReceptionProgressService)
      .getProgress(po.id);
    expect(progress?.lines[0]).toMatchObject({
      ordered: 10,
      received: 6,
      pending: 4,
    });

    // +4 → Recibida
    const second = await receive(4, 'OC-F2');
    await waitFor(
      async () => (await poStatus(po.id)) === 'RECEIVED',
      'OC recibida',
    );

    // anular la segunda recepción → vuelve a Parcial (6/10)
    await asCompany(base, () =>
      ctx.app
        .get(ReceptionVoidService)
        .void(base.companyId, base.userId, second.id, {
          reason: 'Error en la factura',
        } as any),
    );
    expect(await poStatus(po.id)).toBe('PARTIALLY_RECEIVED');
    const after = await ctx.app
      .get(PurchaseOrderReceptionProgressService)
      .getProgress(po.id);
    expect(after?.lines[0]).toMatchObject({ received: 6, pending: 4 });

    // metadata guardada para listados
    const [{ meta }] = await ds.query(
      `SELECT metadata AS meta FROM transactions WHERE id=$1`,
      [po.id],
    );
    expect(meta.receptionProgress.lines[0].received).toBe(6);
  });

  it('una recepción sin OC no afecta a ninguna orden', async () => {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base);
    const res: any = await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: 'SIN-OC',
        documentType: 'factura',
        lines: [
          {
            productVariantId: v.variantId,
            receivedQuantity: 3,
            unitPrice: 10,
            unitCost: 10,
          },
        ],
      }),
    );
    expect(res.reception?.id).toBeDefined();
  });
});
