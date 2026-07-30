import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductVariantFiscalFields1756730000000 implements MigrationInterface {
  name = 'ProductVariantFiscalFields1756730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_variants
      ADD COLUMN IF NOT EXISTS tax_category varchar(40) NOT NULL DEFAULT 'TAX_STANDARD'
    `);
    await queryRunner.query(`
      ALTER TABLE product_variants
      ADD COLUMN IF NOT EXISTS requires_dte boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE product_variants
      SET tax_category = 'TAX_STANDARD', requires_dte = true
      WHERE tax_category IS NULL OR tax_category = ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_variants DROP COLUMN IF EXISTS requires_dte
    `);
    await queryRunner.query(`
      ALTER TABLE product_variants DROP COLUMN IF EXISTS tax_category
    `);
  }
}
