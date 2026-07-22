import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionUnitMonthlyCapacity1757350000000
  implements MigrationInterface
{
  name = 'ProductionUnitMonthlyCapacity1757350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE production_units
      ADD COLUMN IF NOT EXISTS monthly_capacity numeric(18, 4) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE production_units
      DROP COLUMN IF EXISTS monthly_capacity
    `);
  }
}
