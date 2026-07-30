import { MigrationInterface, QueryRunner } from 'typeorm';

export class StockLevelThresholds1753000000000 implements MigrationInterface {
  name = 'StockLevelThresholds1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_levels"
      ADD COLUMN IF NOT EXISTS "minimum_stock" integer NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_levels"
      ADD COLUMN IF NOT EXISTS "maximum_stock" integer NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_levels"
      ADD COLUMN IF NOT EXISTS "reorder_point" integer NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_levels" DROP COLUMN IF EXISTS "reorder_point";
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_levels" DROP COLUMN IF EXISTS "maximum_stock";
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_levels" DROP COLUMN IF EXISTS "minimum_stock";
    `);
  }
}
