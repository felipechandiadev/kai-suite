import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductVariantCountStockBridge1751000000000 implements MigrationInterface {
  name = 'ProductVariantCountStockBridge1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variants"
        ADD COLUMN IF NOT EXISTS "stock_base_qty_per_count_sale_unit" numeric(18,9),
        ADD COLUMN IF NOT EXISTS "stock_base_qty_per_count_purchase_unit" numeric(18,9)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variants"
        DROP COLUMN IF EXISTS "stock_base_qty_per_count_sale_unit",
        DROP COLUMN IF EXISTS "stock_base_qty_per_count_purchase_unit"
    `);
  }
}
