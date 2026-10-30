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

describe('Recepción de compra → atomicidad (BD real)', () => {
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

  const countByRef = async (ref: string) =>
    Number(
      (
        await ds.query(
          `SELECT COUNT(*)::int AS n FROM receptions WHERE reference=$1`,
          [ref],
        )
      )[0].n,
    );

  it('si falla el ingreso de stock, no queda recepción huérfana y el folio se puede reingresar', async () => {
    const supplierId = await createSupplier(ds, base);
    const { variantId } = await createPhysicalVariant(ds, base);
    const payload = (sid: string | null) => ({
      storageId: base.storageId,
      branchId: base.branchId,
      supplierId: sid,
      userId: base.userId,
      reference: 'ATOM-1',
      documentType: 'factura',
      lines: [
        {
          productVariantId: variantId,
          receivedQuantity: 3,
          unitPrice: 10,
          unitCost: 10,
        },
      ],
    });

    // Sin proveedor la transacción de ingreso no se puede crear
    await expect(
      asCompany(base, () => receptions.createDirect(payload(null))),
    ).rejects.toThrow(/No se registró la recepción/);
    expect(await countByRef('ATOM-1')).toBe(0);
    const [{ n }] = await ds.query(
      `SELECT COUNT(*)::int AS n FROM reception_lines WHERE "productVariantId"=$1`,
      [variantId],
    );
    expect(n).toBe(0);

    // El mismo folio se puede registrar ahora sin choque de duplicado
    const ok: any = await asCompany(base, () =>
      receptions.createDirect(payload(supplierId)),
    );
    expect(ok.reception.status).toBe('ACTIVE');
    await waitForStock(ds, variantId, base.storageId, 3);
  });

  it('si falla el documento del proveedor queda INCOMPLETA y se puede anular', async () => {
    const supplierId = await createSupplier(ds, base);
    const { variantId } = await createPhysicalVariant(ds, base);
    const res: any = await asCompany(base, () =>
      receptions.createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: 'ATOM-2',
        documentType: 'invoice',
        // sin datos fiscales válidos → el documento del proveedor falla
        lines: [
          {
            productVariantId: variantId,
            receivedQuantity: 2,
            unitPrice: 10,
            unitCost: 10,
          },
        ],
      }),
    );
    expect(res.supplierDocumentError).toBeTruthy();
    expect(res.reception.status).toBe('INCOMPLETE');
    await waitForStock(ds, variantId, base.storageId, 2);

    await asCompany(base, () =>
      voider.void(base.companyId, base.userId, res.reception.id, {
        reason: 'Reintento tras fallo',
      } as any),
    );
    expect(await physicalStock(ds, variantId, base.storageId)).toBe(0);
  });
});
