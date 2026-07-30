import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductVariantSalePriceHistory1756210000000 implements MigrationInterface {
  name = 'ProductVariantSalePriceHistory1756210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "salePriceHistory" json`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE product_variants DROP COLUMN IF EXISTS "salePriceHistory"`,
    );
  }
}
