import { MigrationInterface, QueryRunner } from 'typeorm';

export class VariantLaborCostOverride1757360000000
  implements MigrationInterface
{
  name = 'VariantLaborCostOverride1757360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_variants
      ADD COLUMN IF NOT EXISTS labor_cost_override numeric(15, 6) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_variants
      DROP COLUMN IF EXISTS labor_cost_override
    `);
  }
}
