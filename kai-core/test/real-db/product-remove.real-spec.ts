import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductsService } from '../../src/modules/products/application/products.service';
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

describe('Eliminar producto (BD real)', () => {
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

  it('sin existencias: elimina el producto y sus variantes', async () => {
    const v = await createPhysicalVariant(ds, base);
    await asCompany(base, () =>
      ctx.app.get(ProductsService).remove(v.productId),
    );

    const [p] = await ds.query(`SELECT "deletedAt" FROM products WHERE id=$1`, [
      v.productId,
    ]);
    const [pv] = await ds.query(
      `SELECT "deletedAt" FROM product_variants WHERE id=$1`,
      [v.variantId],
    );
    expect(p.deletedAt).not.toBeNull();
    expect(pv.deletedAt).not.toBeNull();
  });

  it('con existencias: se bloquea y no cambia nada', async () => {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base);
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `P-${v.sku}`,
        documentType: 'factura',
        lines: [
          {
            productVariantId: v.variantId,
            receivedQuantity: 4,
            unitPrice: 10,
            unitCost: 10,
          },
        ],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 4);

    await expect(
      asCompany(base, () => ctx.app.get(ProductsService).remove(v.productId)),
    ).rejects.toBeInstanceOf(BadRequestException);

    const [p] = await ds.query(`SELECT "deletedAt" FROM products WHERE id=$1`, [
      v.productId,
    ]);
    const [pv] = await ds.query(
      `SELECT "deletedAt" FROM product_variants WHERE id=$1`,
      [v.variantId],
    );
    expect(p.deletedAt).toBeNull();
    expect(pv.deletedAt).toBeNull();
  });
});
