import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CTP: `limitsProjectedStock` en recipe_lines;
 * dining: vínculo de reserva de insumos al fire.
 */
export class RecipeCtpAndDiningMaterialReservation1757120000000
  implements MigrationInterface
{
  name = 'RecipeCtpAndDiningMaterialReservation1757120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE recipe_lines
      ADD COLUMN IF NOT EXISTS "limitsProjectedStock" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      ADD COLUMN IF NOT EXISTS material_reservation_transaction_id uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      ADD COLUMN IF NOT EXISTS materials_reserved_at timestamptz NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dining_order_lines_material_reservation_tx
      ON dining_order_lines (material_reservation_transaction_id)
      WHERE material_reservation_transaction_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dining_order_lines_material_reservation_tx
    `);
    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      DROP COLUMN IF EXISTS materials_reserved_at
    `);
    await queryRunner.query(`
      ALTER TABLE dining_order_lines
      DROP COLUMN IF EXISTS material_reservation_transaction_id
    `);
    await queryRunner.query(`
      ALTER TABLE recipe_lines
      DROP COLUMN IF EXISTS "limitsProjectedStock"
    `);
  }
}
