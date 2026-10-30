import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';
import { CreateTransactionDto } from '../../src/modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '../../src/modules/transactions/application/transactions.service';
import { TransactionType } from '../../src/modules/transactions/domain/transaction.entity';
import { SalesReportsQueryService } from '../../src/modules/sales-reports/application/sales-reports-query.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import {
  asCompany,
  BaseFixtures,
  createPhysicalVariant,
  loadBase,
} from './support/fixtures';

describe('Rentabilidad por dimensión (BD real)', () => {
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

  it('calcula utilidad y margen % por producto y por vendedor; líneas sin costo no inflan la utilidad', async () => {
    const a = await createPhysicalVariant(ds, base, { basePrice: 500 });
    const b = await createPhysicalVariant(ds, base, { basePrice: 500 });
    const sell = (
      v: { productId: string; variantId: string; sku: string },
      qty: number,
      unitCost: number | null,
    ) => {
      const total = qty * 500;
      return asCompany(base, () =>
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
                productName: `P-${v.sku}`,
                productSku: v.sku,
                quantity: qty,
                unitPrice: 500,
                ...(unitCost != null ? { unitCost } : {}),
                subtotal: total,
                total,
              },
            ],
          }) as any,
        ),
      );
    };
    await sell(a, 2, 100); // venta 1000, costo 200 → utilidad 800, margen 80%
    await sell(b, 1, null); // venta 500 sin costo

    const q = ctx.app.get(SalesReportsQueryService);
    const range = q.parseDateRange({
      dateFrom: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      dateTo: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    });
    const byProduct = await q.profitabilityBy(base.companyId, range, 'product');
    const ra = byProduct.find((r) => r.key === a.productId)!;
    expect(ra).toMatchObject({ revenue: 1000, cogs: 200, profit: 800, marginPct: 80 });
    const rb = byProduct.find((r) => r.key === b.productId)!;
    expect(rb).toMatchObject({ revenue: 500, profit: 0, linesMissingCost: 1 });
    expect(rb.marginPct).toBeNull();

    const bySeller = await q.profitabilityBy(base.companyId, range, 'seller');
    expect(bySeller.reduce((s, r) => s + r.profit, 0)).toBeGreaterThanOrEqual(800);
    const byCategory = await q.profitabilityBy(base.companyId, range, 'category');
    expect(byCategory.length).toBeGreaterThan(0);
    const byCustomer = await q.profitabilityBy(base.companyId, range, 'customer');
    expect(byCustomer.length).toBeGreaterThan(0);
  });
});
