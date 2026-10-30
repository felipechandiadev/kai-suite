import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';
import { CreateTransactionDto } from '../../src/modules/transactions/application/dto/create-transaction.dto';
import { ReceptionsService } from '../../src/modules/receptions/application/receptions.service';
import { ReceptionVoidService } from '../../src/modules/receptions/application/reception-void.service';
import { TransactionsService } from '../../src/modules/transactions/application/transactions.service';
import { TransactionType } from '../../src/modules/transactions/domain/transaction.entity';
import { InventoryReconciliationService } from '../../src/modules/inventory/application/inventory-reconciliation.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import {
  asCompany,
  BaseFixtures,
  createPhysicalVariant,
  createSupplier,
  loadBase,
  waitForStock,
} from './support/fixtures';

describe('Conciliación de inventario (BD real)', () => {
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

  it('no reporta descuadre tras compra, venta y anulación; detecta stock alterado a mano', async () => {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { basePrice: 500 });
    const rec: any = await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: 'CONC-1',
        documentType: 'factura',
        lines: [
          { productVariantId: v.variantId, receivedQuantity: 10, unitPrice: 100, unitCost: 100 },
        ],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 10);
    await asCompany(base, () =>
      ctx.app.get(TransactionsService).createTransaction(
        plainToInstance(CreateTransactionDto, {
          transactionType: TransactionType.SALE,
          branchId: base.branchId,
          userId: base.userId,
          storageId: base.storageId,
          pointOfSaleId: base.pointOfSaleId,
          subtotal: 1500,
          total: 1500,
          amountPaid: 1500,
          lines: [
            {
              productId: v.productId,
              productVariantId: v.variantId,
              productName: 'P',
              productSku: v.sku,
              quantity: 3,
              unitPrice: 500,
              unitCost: 100,
              subtotal: 1500,
              total: 1500,
            },
          ],
        }) as any,
      ),
    );
    await waitForStock(ds, v.variantId, base.storageId, 7);

    const svc = ctx.app.get(InventoryReconciliationService);
    const find = async () =>
      (await asCompany(base, () => svc.reconcile(base.companyId))).mismatches.find(
        (m) => m.variantId === v.variantId,
      );
    expect(await find()).toBeUndefined();

    // Alteración manual del stock: debe aparecer con su diferencia y valor
    await ds.query(
      `UPDATE stock_levels SET "physicalStock"=12 WHERE "productVariantId"=$1 AND "storageId"=$2`,
      [v.variantId, base.storageId],
    );
    const m = await find();
    expect(m).toMatchObject({ recordedStock: 12, expectedStock: 7, difference: 5 });
    expect(rec.reception?.id).toBeDefined();
  });

  it('una recepción anulada tampoco genera descuadre', async () => {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base);
    const rec: any = await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: 'CONC-2',
        documentType: 'factura',
        lines: [
          { productVariantId: v.variantId, receivedQuantity: 4, unitPrice: 50, unitCost: 50 },
        ],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 4);
    await asCompany(base, () =>
      ctx.app.get(ReceptionVoidService).void(base.companyId, base.userId, rec.reception.id, {
        reason: 'Conciliación',
      } as any),
    );
    await waitForStock(ds, v.variantId, base.storageId, 0);
    const report = await asCompany(base, () =>
      ctx.app.get(InventoryReconciliationService).reconcile(base.companyId),
    );
    expect(report.mismatches.find((m) => m.variantId === v.variantId)).toBeUndefined();
  });
});
