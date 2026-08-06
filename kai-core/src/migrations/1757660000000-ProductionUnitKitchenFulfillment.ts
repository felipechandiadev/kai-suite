import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionUnitKitchenFulfillment1757660000000
  implements MigrationInterface
{
  name = 'ProductionUnitKitchenFulfillment1757660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE production_units
      ADD COLUMN IF NOT EXISTS kitchen_fulfillment_mode varchar(16) NOT NULL DEFAULT 'KDS'
    `);
    await queryRunner.query(`
      ALTER TABLE production_units
      ADD COLUMN IF NOT EXISTS kitchen_print_settings jsonb NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE production_units
      DROP COLUMN IF EXISTS kitchen_print_settings
    `);
    await queryRunner.query(`
      ALTER TABLE production_units
      DROP COLUMN IF EXISTS kitchen_fulfillment_mode
    `);
  }
}
