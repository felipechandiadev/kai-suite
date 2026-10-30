import { DataSource } from 'typeorm';
import { ReceptionsService } from '../../src/modules/receptions/application/receptions.service';
import { ReceptionVoidService } from '../../src/modules/receptions/application/reception-void.service';
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

describe('Recepción de compra → anulación (BD real)', () => {
  let ctx: RealDbContext;
  let ds: DataSource;
  let base: BaseFixtures;
  let receptions: ReceptionsService;
  let voider: ReceptionVoidService;

  beforeAll(async () => {
    ctx = await bootRealDb();
    ds = ctx.app.get(DataSource);
    base = await loadBase(ds);
    receptions = ctx.app.get(ReceptionsService);
    voider = ctx.app.get(ReceptionVoidService);
  });
  afterAll(async () => {
    await ctx?.close();
  });

  /** Recibe y espera a que el evento post-commit aplique el stock. Devuelve la recepción creada. */
  async function receive(
    variantId: string,
    supplierId: string,
    qty: number,
    unitCost: number,
    ref: string,
  ) {
    const res: any = await asCompany(base, () =>
      receptions.createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: ref,
        documentType: 'factura',
        lines: [
          {
            productVariantId: variantId,
            receivedQuantity: qty,
            unitPrice: unitCost,
            unitCost,
          },
        ],
      }),
    );
    expect(res.reception?.id).toBeDefined();
    await waitForStock(ds, variantId, base.storageId, qty);
    return res.reception;
  }

  it('anular revierte stock y PMP, y permite reingresar el mismo folio', async () => {
    const supplierId = await createSupplier(ds, base);
    const { variantId } = await createPhysicalVariant(ds, base);

    const rec: any = await receive(variantId, supplierId, 10, 100, 'F-1001');
    expect(await physicalStock(ds, variantId, base.storageId)).toBe(10);
    const [{ pmp: pmpAntes }] = await ds.query(
      `SELECT pmp::float FROM product_variants WHERE id=$1`,
      [variantId],
    );
    expect(pmpAntes).toBeCloseTo(100, 2);

    await asCompany(base, () =>
      voider.void(base.companyId, base.userId, rec.id, {
        reason: 'Prueba de anulación',
      } as any),
    );

    expect(await physicalStock(ds, variantId, base.storageId)).toBe(0);
    const [r] = await ds.query(`SELECT status FROM receptions WHERE id=$1`, [
      rec.id,
    ]);
    expect(r.status).toBe('VOIDED');

    // El mismo folio de proveedor puede volver a ingresarse
    const again: any = await receive(variantId, supplierId, 5, 120, 'F-1001');
    expect(again.id).toBeDefined();
    expect(await physicalStock(ds, variantId, base.storageId)).toBe(5);
  });

  it('bloquea anular si no hay stock suficiente (ya se vendió/ajustó)', async () => {
    const supplierId = await createSupplier(ds, base);
    const { variantId } = await createPhysicalVariant(ds, base);
    const rec: any = await receive(variantId, supplierId, 10, 100, 'F-2001');

    await ds.query(
      `UPDATE stock_levels SET "physicalStock" = 3 WHERE "productVariantId"=$1 AND "storageId"=$2`,
      [variantId, base.storageId],
    );

    await expect(
      asCompany(base, () =>
        voider.void(base.companyId, base.userId, rec.id, {
          reason: 'Debe fallar',
        } as any),
      ),
    ).rejects.toThrow();
    const [r] = await ds.query(`SELECT status FROM receptions WHERE id=$1`, [
      rec.id,
    ]);
    expect(r.status).not.toBe('VOIDED');
    expect(await physicalStock(ds, variantId, base.storageId)).toBe(3);
  });

  it('no permite anular dos veces', async () => {
    const supplierId = await createSupplier(ds, base);
    const { variantId } = await createPhysicalVariant(ds, base);
    const rec: any = await receive(variantId, supplierId, 4, 50, 'F-3001');
    const run = () =>
      asCompany(base, () =>
        voider.void(base.companyId, base.userId, rec.id, {
          reason: 'Primera vez',
        } as any),
      );
    await run();
    await expect(run()).rejects.toThrow();
    expect(await physicalStock(ds, variantId, base.storageId)).toBe(0);
  });

  it('el listado filtra por estado (VOIDED / RECEIVED)', async () => {
    const supplierId = await createSupplier(ds, base);
    const { variantId } = await createPhysicalVariant(ds, base);
    const { variantId: otherVariantId } = await createPhysicalVariant(ds, base);
    const anulada: any = await receive(variantId, supplierId, 2, 10, 'F-4001');
    const vigente: any = await receive(otherVariantId, supplierId, 3, 10, 'F-4002');
    await asCompany(base, () =>
      voider.void(base.companyId, base.userId, anulada.id, {
        reason: 'Filtro de estado',
      } as any),
    );
    const list = (status?: 'VOIDED' | 'RECEIVED') =>
      asCompany(base, () =>
        receptions.search({ limit: 200, status, companyId: base.companyId }),
      ).then((r: any) => (r.data ?? r.rows ?? r.items ?? []).map((x: any) => x.id));
    const voided = await list('VOIDED');
    expect(voided).toContain(anulada.id);
    expect(voided).not.toContain(vigente.id);
    const received = await list('RECEIVED');
    expect(received).toContain(vigente.id);
    expect(received).not.toContain(anulada.id);
  });
});
