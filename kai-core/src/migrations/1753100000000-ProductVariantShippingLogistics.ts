import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductVariantShippingLogistics1753100000000
  implements MigrationInterface
{
  name = 'ProductVariantShippingLogistics1753100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "net_weight_kg" numeric(14,6) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "gross_weight_kg" numeric(14,6) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "package_length_cm" numeric(12,3) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "package_width_cm" numeric(12,3) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "package_height_cm" numeric(12,3) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "volumetric_divisor_k" integer NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "volumetric_divisor_k";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "package_height_cm";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "package_width_cm";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "package_length_cm";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "gross_weight_kg";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "net_weight_kg";
    `);
  }
}
