import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Correlativo diario de pedidos de cocina (kitchen fire) por sucursal.
 */
export class DiningKitchenFireNumber1757150000000
  implements MigrationInterface
{
  name = 'DiningKitchenFireNumber1757150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dining_kitchen_fire_sequences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        branch_id uuid NOT NULL,
        period_key varchar(10) NOT NULL,
        last_number int NOT NULL DEFAULT 0
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_dining_kitchen_fire_sequences_scope
      ON dining_kitchen_fire_sequences (branch_id, period_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dining_kitchen_fire_sequences_company_id
      ON dining_kitchen_fire_sequences (company_id)
    `);

    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      ADD COLUMN IF NOT EXISTS kitchen_fire_number int NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      DROP COLUMN IF EXISTS kitchen_fire_number
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dining_kitchen_fire_sequences_company_id
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_dining_kitchen_fire_sequences_scope
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS dining_kitchen_fire_sequences
    `);
  }
}
