import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';
import { CreateTransactionDto } from '../../src/modules/transactions/application/dto/create-transaction.dto';
import { ReceptionsService } from '../../src/modules/receptions/application/receptions.service';
import { TransactionsService } from '../../src/modules/transactions/application/transactions.service';
import { Transaction, TransactionType } from '../../src/modules/transactions/domain/transaction.entity';
import { UpdateStockActionHandler } from '../../src/modules/automation/application/handlers/actions/update-stock.action';
import { StockEventRetryService } from '../../src/modules/automation/application/stock-event-retry.service';
import { AutomationEventType } from '../../src/modules/automation/domain/automation-event-type.enum';
import { bootRealDb, RealDbContext } from './support/app-context';
import {
  asCompany,
  BaseFixtures,
  createPhysicalVariant,
  createSupplier,
  loadBase,
  physicalStock,
  waitFor,
  waitForStock,
} from './support/fixtures';

describe('Eventos de stock: idempotencia, fallo visible y reintento (BD real)', () => {
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

  async function stockedSale() {
    const supplierId = await createSupplier(ds, base);
    const v = await createPhysicalVariant(ds, base, { basePrice: 500 });
    await asCompany(base, () =>
      ctx.app.get(ReceptionsService).createDirect({
        storageId: base.storageId,
        branchId: base.branchId,
        supplierId,
        userId: base.userId,
        reference: `EV-${v.sku}`,
        documentType: 'factura',
        lines: [{ productVariantId: v.variantId, receivedQuantity: 10, unitPrice: 100, unitCost: 100 }],
      }),
    );
    await waitForStock(ds, v.variantId, base.storageId, 10);
    const sale: any = await asCompany(base, () =>
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
    return { v, sale };
  }

  const logOf = async (txId: string) =>
    (await ds.query(`SELECT status, attempts, last_error FROM stock_event_logs WHERE transaction_id=$1`, [txId]))[0];

  it('aplicar dos veces el mismo evento no descuenta dos veces', async () => {
    const { v, sale } = await stockedSale();
    await waitFor(async () => (await logOf(sale.id))?.status === 'APPLIED', 'log APPLIED');
    const tx = await ds.getRepository(Transaction).findOneOrFail({ where: { id: sale.id }, relations: ['lines'] });
    await asCompany(base, () =>
      ctx.app.get(UpdateStockActionHandler).execute(
        { companyId: base.companyId, eventType: AutomationEventType.TRANSACTION_CREATED, payload: { transaction: tx } },
        null,
      ),
    );
    expect(await physicalStock(ds, v.variantId, base.storageId)).toBe(7);
  });

  it('un fallo queda registrado como FAILED, es visible y el reintento lo aplica una sola vez', async () => {
    const { v, sale } = await stockedSale();
    await waitFor(async () => (await logOf(sale.id))?.status === 'APPLIED', 'log APPLIED');
    // Simula que la aplicación original nunca ocurrió
    await ds.query(`DELETE FROM stock_event_logs WHERE transaction_id=$1`, [sale.id]);
    await ds.query(
      `UPDATE stock_levels SET "physicalStock"=10, "availableStock"=10 WHERE "productVariantId"=$1 AND "storageId"=$2`,
      [v.variantId, base.storageId],
    );

    const handler = ctx.app.get(UpdateStockActionHandler);
    const companies = (handler as any).companiesService;
    const spy = jest.spyOn(companies, 'getCompanyById').mockRejectedValue(new Error('fallo simulado'));
    const tx = await ds.getRepository(Transaction).findOneOrFail({ where: { id: sale.id }, relations: ['lines'] });
    await expect(
      handler.execute(
        { companyId: base.companyId, eventType: AutomationEventType.TRANSACTION_CREATED, payload: { transaction: tx } },
        null,
      ),
    ).rejects.toThrow('fallo simulado');
    spy.mockRestore();

    expect(await logOf(sale.id)).toMatchObject({ status: 'FAILED', attempts: 1 });
    expect(await physicalStock(ds, v.variantId, base.storageId)).toBe(10); // nada a medias

    const retry = ctx.app.get(StockEventRetryService);
    const failed = await retry.listFailed(base.companyId);
    expect(failed.map((f) => f.transactionId)).toContain(sale.id);

    const res = await retry.retryFailed(base.companyId, { force: true });
    expect(res.applied).toBeGreaterThanOrEqual(1);
    expect(await logOf(sale.id)).toMatchObject({ status: 'APPLIED' });
    expect(await physicalStock(ds, v.variantId, base.storageId)).toBe(7);
    // un segundo reintento no hace nada
    await retry.retryFailed(base.companyId, { force: true });
    expect(await physicalStock(ds, v.variantId, base.storageId)).toBe(7);
  });
});
