import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProductVariantLegacyWeight1756220000000
  implements MigrationInterface
{
  name = 'RemoveProductVariantLegacyWeight1756220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasWeight = await queryRunner.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'product_variants'
        AND column_name = 'weight'
      LIMIT 1;
    `);
    if (Array.isArray(hasWeight) && hasWeight.length > 0) {
      await queryRunner.query(`
        UPDATE "product_variants"
        SET "net_weight_kg" = "weight"
        WHERE "net_weight_kg" IS NULL
          AND "weight" IS NOT NULL;
      `);
    }
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "weight";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "weight_unit";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "weight" numeric(10,3) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "weight_unit" varchar(16) NOT NULL DEFAULT 'kg';
    `);
    await queryRunner.query(`
      UPDATE "product_variants"
      SET "weight" = "net_weight_kg"
      WHERE "weight" IS NULL
        AND "net_weight_kg" IS NOT NULL;
    `);
  }
}
