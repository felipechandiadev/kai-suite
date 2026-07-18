import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tanda de envío a cocina: `kitchen_fire_id` agrupa líneas en KDS (Pedido).
 */
export class DiningKitchenFireId1757140000000 implements MigrationInterface {
  name = 'DiningKitchenFireId1757140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      ADD COLUMN IF NOT EXISTS kitchen_fire_id uuid NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dining_order_lines_kitchen_fire
      ON dining_order_lines (production_unit_id, kitchen_fire_id, kitchen_status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dining_order_lines_kitchen_fire
    `);
    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      DROP COLUMN IF EXISTS kitchen_fire_id
    `);
  }
}
