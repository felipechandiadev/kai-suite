import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Umbrales de stock: valor + flag explícito de habilitación (variante y por almacén).
 * Backfill: enabled = (valor > 0) en variante; en stock_levels NULL hereda, si hay override usa (valor > 0).
 */
export class StockThresholdEnabledFlags1756100000000 implements MigrationInterface {
  name = 'StockThresholdEnabledFlags1756100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "minimum_stock_enabled" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "maximum_stock_enabled" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "reorder_point_enabled" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_levels"
      ADD COLUMN IF NOT EXISTS "minimum_stock_enabled" boolean NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_levels"
      ADD COLUMN IF NOT EXISTS "maximum_stock_enabled" boolean NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_levels"
      ADD COLUMN IF NOT EXISTS "reorder_point_enabled" boolean NULL;
    `);

    await queryRunner.query(`
      UPDATE "product_variants"
      SET
        "minimum_stock_enabled" = COALESCE("minimumStock", 0) > 0,
        "maximum_stock_enabled" = COALESCE("maximumStock", 0) > 0,
        "reorder_point_enabled" = COALESCE("reorderPoint", 0) > 0;
    `);

    await queryRunner.query(`
      UPDATE "stock_levels"
      SET
        "minimum_stock_enabled" = CASE
          WHEN "minimum_stock" IS NULL THEN NULL
          ELSE COALESCE("minimum_stock", 0) > 0
        END,
        "maximum_stock_enabled" = CASE
          WHEN "maximum_stock" IS NULL THEN NULL
          ELSE COALESCE("maximum_stock", 0) > 0
        END,
        "reorder_point_enabled" = CASE
          WHEN "reorder_point" IS NULL THEN NULL
          ELSE COALESCE("reorder_point", 0) > 0
        END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_levels" DROP COLUMN IF EXISTS "reorder_point_enabled";
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_levels" DROP COLUMN IF EXISTS "maximum_stock_enabled";
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_levels" DROP COLUMN IF EXISTS "minimum_stock_enabled";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "reorder_point_enabled";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "maximum_stock_enabled";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "minimum_stock_enabled";
    `);
  }
}
