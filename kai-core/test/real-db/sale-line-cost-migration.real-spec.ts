import { DataSource } from 'typeorm';
import { SaleLineUnitCostPerLineUnit1757770000000 } from '../../src/migrations/1757770000000-SaleLineUnitCostPerLineUnit';
import { bootRealDb, RealDbContext } from './support/app-context';
import { BaseFixtures, createPhysicalVariant, loadBase } from './support/fixtures';

describe('Migración: costo de líneas de venta por unidad de la línea (BD real)', () => {
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

  it('reexpresa solo las líneas de SALE con conversión y deja intactas las demás', async () => {
    const v = await createPhysicalVariant(ds, base, { basePrice: 500 });
    const mkTx = async (type: string) => {
      const [{ id }] = await ds.query(
        `INSERT INTO transactions ("transactionType", status, company_id, "branchId", "userId", subtotal, total, "documentNumber")
         VALUES ($1::transactions_transactiontype_enum, 'CONFIRMED', $2, $3, $4, 0, 0, $5) RETURNING id`,
        [type, base.companyId, base.branchId, base.userId, `MIG-${type}-${Math.random().toString(36).slice(2, 8)}`],
      );
      return id as string;
    };
    const mkLine = async (txId: string, qty: number, qtyBase: number, unitCost: number) => {
      const [{ id }] = await ds.query(
        `INSERT INTO transaction_lines ("transactionId", company_id, "productVariantId", "productName", quantity, "quantityInBase", "unitPrice", "unitCost", subtotal, total, "lineNumber")
         VALUES ($1,$2,$3,'P',$4,$5,1000,$6,0,0,1) RETURNING id`,
        [txId, base.companyId, v.variantId, qty, qtyBase, unitCost],
      );
      return id as string;
    };
    const sale = await mkTx('SALE');
    const purchase = await mkTx('PURCHASE');
    const convertedSale = await mkLine(sale, 2, 2000, 0.4); // venta en kg, costo por g
    const plainSale = await mkLine(sale, 3, 3, 120); // sin conversión
    const convertedPurchase = await mkLine(purchase, 2, 2000, 400); // compra: no se toca

    const qr = ds.createQueryRunner();
    await new SaleLineUnitCostPerLineUnit1757770000000().up(qr);
    await qr.release();

    const cost = async (id: string) =>
      (await ds.query(`SELECT "unitCost"::float AS c FROM transaction_lines WHERE id=$1`, [id]))[0].c;
    expect(await cost(convertedSale)).toBe(400);
    expect(await cost(plainSale)).toBe(120);
    expect(await cost(convertedPurchase)).toBe(400);
  });
});
