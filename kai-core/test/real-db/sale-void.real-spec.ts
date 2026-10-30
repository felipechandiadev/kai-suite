import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';
import { CreateTransactionDto } from '../../src/modules/transactions/application/dto/create-transaction.dto';
import { ReceptionsService } from '../../src/modules/receptions/application/receptions.service';
import { TransactionsService } from '../../src/modules/transactions/application/transactions.service';
import { VoidSaleService } from '../../src/modules/transactions/application/void-sale.service';
import { TransactionType } from '../../src/modules/transactions/domain/transaction.entity';
import { bootRealDb, RealDbContext } from './support/app-context';
import {
  asCompany,
  BaseFixtures,
  createPhysicalVariant,
  createSupplier,
  loadBase,
  waitForStock,
} from './support/fixtures';

describe('Venta → anulación (BD real)', () => {
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

  async function stockedVariant(qty: number) {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { basePrice: 500 });
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `S-${v.sku}`,
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
    await waitForStock(ds, v.variantId, base.storageId, qty);
    return v;
  }

  async function sell(
    v: { productId: string; variantId: string; sku: string },
    qty: number,
  ) {
    const total = qty * 500;
    const tx: any = await asCompany(base, () =>
      ctx.app.get(TransactionsService).createTransaction(
        plainToInstance(CreateTransactionDto, {
          transactionType: TransactionType.SALE,
          branchId: base.branchId,
          userId: base.userId,
          storageId: base.storageId,
          pointOfSaleId: base.pointOfSaleId,
          subtotal: total,
          total,
          amountPaid: total,
          lines: [
            {
              productId: v.productId,
              productVariantId: v.variantId,
              productName: 'Producto prueba',
              productSku: v.sku,
              quantity: qty,
              unitPrice: 500,
              unitCost: 100,
              subtotal: total,
              total,
            },
          ],
        }) as any,
      ),
    );
    expect(tx.id).toBeDefined();
    return tx;
  }

  it('una venta sin fila de stock previa registra el descuento (stock negativo) en vez de perderlo', async () => {
    const v = await createPhysicalVariant(ds, base, { basePrice: 500 });
    await sell(v, 2);
    await waitForStock(ds, v.variantId, base.storageId, -2);
  });

  it('vender descuenta stock y anular lo restituye', async () => {
    const v = await stockedVariant(10);
    const sale = await sell(v, 3);
    await waitForStock(ds, v.variantId, base.storageId, 7);

    await asCompany(base, () =>
      ctx.app.get(VoidSaleService).void(base.companyId, base.userId, sale.id, {
        reason: 'Prueba de anulación',
      } as any),
    );

    await waitForStock(ds, v.variantId, base.storageId, 10);
    const [s] = await ds.query(
      `SELECT status AS st FROM transactions WHERE id=$1`,
      [sale.id],
    );
    expect(s.st).toBe('VOIDED');
  });

  it('no permite anular una venta dos veces (el stock no se duplica)', async () => {
    const v = await stockedVariant(5);
    const sale = await sell(v, 2);
    await waitForStock(ds, v.variantId, base.storageId, 3);
    const run = () =>
      asCompany(base, () =>
        ctx.app
          .get(VoidSaleService)
          .void(base.companyId, base.userId, sale.id, {
            reason: 'Doble anulación',
          } as any),
      );
    await run();
    await waitForStock(ds, v.variantId, base.storageId, 5);
    await expect(run()).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 500));
    await waitForStock(ds, v.variantId, base.storageId, 5);
  });
});
