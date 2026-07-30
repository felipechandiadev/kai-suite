import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Unidad de stock (canónica), unidad de venta por defecto y unidad de compra por defecto por variante.
 * Backfill desde `unit_id` para mantener comportamiento previo.
 */
export class ProductVariantUomTriplet1750000000000 implements MigrationInterface {
  name = 'ProductVariantUomTriplet1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variants"
        ADD COLUMN IF NOT EXISTS "stock_base_unit_id" uuid,
        ADD COLUMN IF NOT EXISTS "sale_unit_id" uuid,
        ADD COLUMN IF NOT EXISTS "purchase_unit_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "product_variants"
      SET
        "stock_base_unit_id" = COALESCE("stock_base_unit_id", "unit_id"),
        "sale_unit_id" = COALESCE("sale_unit_id", "unit_id"),
        "purchase_unit_id" = COALESCE("purchase_unit_id", "unit_id")
      WHERE "stock_base_unit_id" IS NULL
         OR "sale_unit_id" IS NULL
         OR "purchase_unit_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "product_variants"
        ALTER COLUMN "stock_base_unit_id" SET NOT NULL,
        ALTER COLUMN "sale_unit_id" SET NOT NULL,
        ALTER COLUMN "purchase_unit_id" SET NOT NULL
    `);

    // Idempotente: el esquema pudo aplicarse antes (p. ej. synchronize) sin registrar la migración.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_product_variants_stock_base_unit'
        ) THEN
          ALTER TABLE "product_variants"
            ADD CONSTRAINT "FK_product_variants_stock_base_unit"
            FOREIGN KEY ("stock_base_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_product_variants_sale_unit'
        ) THEN
          ALTER TABLE "product_variants"
            ADD CONSTRAINT "FK_product_variants_sale_unit"
            FOREIGN KEY ("sale_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_product_variants_purchase_unit'
        ) THEN
          ALTER TABLE "product_variants"
            ADD CONSTRAINT "FK_product_variants_purchase_unit"
            FOREIGN KEY ("purchase_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "FK_product_variants_purchase_unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "FK_product_variants_sale_unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "FK_product_variants_stock_base_unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "purchase_unit_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "sale_unit_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "stock_base_unit_id"`,
    );
  }
}
