import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El costo congelado en líneas de VENTA se guardaba por unidad de stock base (PMP) aunque la
 * cantidad estuviera en la unidad de venta, por lo que `unitCost × quantity` (costo de ventas
 * y márgenes) se descuadraba cuando unidad de venta ≠ unidad de stock. Se reexpresa por la
 * unidad de la línea. Solo toca líneas de SALE con conversión distinta de 1.
 */
export class SaleLineUnitCostPerLineUnit1757770000000 implements MigrationInterface {
  name = 'SaleLineUnitCostPerLineUnit1757770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE transaction_lines tl
         SET "unitCost" = ROUND(tl."unitCost" * tl."quantityInBase" / tl.quantity, 2)
        FROM transactions t
       WHERE t.id = tl."transactionId"
         AND t."transactionType"::text = 'SALE'
         AND tl."unitCost" IS NOT NULL AND tl."unitCost" > 0
         AND tl.quantity > 0
         AND tl."quantityInBase" IS NOT NULL AND tl."quantityInBase" > 0
         AND ABS(tl."quantityInBase" / tl.quantity - 1) > 0.000001
    `);
  }

  public async down(): Promise<void> {
    // No reversible de forma segura (el redondeo pierde precisión).
  }
}
