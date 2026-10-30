import { DataSource } from 'typeorm';
import { PurchaseOrdersService } from '../../src/modules/transactions/application/purchase-orders.service';
import { PurchaseSuggestionsService } from '../../src/modules/transactions/application/purchase-suggestions.service';
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

describe('Qué comprar (BD real)', () => {
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

  const suggestions = () =>
    asCompany(base, () =>
      ctx.app.get(PurchaseSuggestionsService).getSuggestions(base.companyId),
    );

  const findItem = (
    groups: Awaited<ReturnType<typeof suggestions>>,
    variantId: string,
  ) => {
    for (const g of groups) {
      const item = g.items.find((i) => i.productVariantId === variantId);
      if (item) return { group: g, item };
    }
    return null;
  };

  it('sugiere variantes bajo el mínimo, agrupadas por último proveedor, y descuenta lo pendiente en OC', async () => {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { baseCost: 80 });
    await ds.query(
      `UPDATE product_variants SET "minimumStock"=10, minimum_stock_enabled=true, "maximumStock"=50, maximum_stock_enabled=true WHERE id=$1`,
      [v.variantId],
    );

    // Sin historial de compras → "Sin proveedor", falta todo: 50 - 0
    let hit = findItem(await suggestions(), v.variantId);
    expect(hit?.group.supplierId).toBeNull();
    expect(hit?.item).toMatchObject({
      reason: 'BELOW_MINIMUM',
      currentStock: 0,
      suggestedQuantity: 50,
      estimatedUnitCost: 80,
    });

    // Se compra 4 u. a un proveedor (sigue bajo el mínimo) → agrupa por ese proveedor, costo = último costo
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: 'SUG-1',
        documentType: 'factura',
        lines: [
          {
            productVariantId: v.variantId,
            receivedQuantity: 4,
            unitPrice: 120,
            unitCost: 120,
          },
        ],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 4);
    hit = findItem(await suggestions(), v.variantId);
    expect(hit?.group.supplierId).toBe(supplierId);
    expect(hit?.item).toMatchObject({
      currentStock: 4,
      suggestedQuantity: 46,
      lastUnitCost: 120,
      estimatedUnitCost: 120,
    });

    // Una OC abierta por 30 → sugiere solo lo que falta: 50 - 4 - 30
    await asCompany(base, () =>
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
            productName: 'P',
            sku: v.sku,
            quantity: 30,
            unitPrice: 120,
            taxIds: [],
          },
        ],
      } as any),
    );
    hit = findItem(await suggestions(), v.variantId);
    expect(hit?.item).toMatchObject({ onOrder: 30, suggestedQuantity: 16 });
  });

  it('no sugiere variantes sin umbrales habilitados ni con stock suficiente', async () => {
    const noThreshold = await createPhysicalVariant(ds, base);
    const enough = await createPhysicalVariant(ds, base);
    await ds.query(
      `UPDATE product_variants SET "minimumStock"=0, minimum_stock_enabled=true WHERE id=$1`,
      [enough.variantId],
    );
    const groups = await suggestions();
    expect(findItem(groups, noThreshold.variantId)).toBeNull();
    // mínimo 0 con stock 0: 0 < 0 es falso → no sugiere
    expect(findItem(groups, enough.variantId)).toBeNull();
  });
});
