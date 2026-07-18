import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Propósito operativo de UP: KITCHEN (KDS) vs BATCH (órdenes de producción).
 */
export class ProductionUnitPurpose1757160000000 implements MigrationInterface {
  name = 'ProductionUnitPurpose1757160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE production_units
      ADD COLUMN IF NOT EXISTS purpose varchar(16) NOT NULL DEFAULT 'KITCHEN'
    `);

    await queryRunner.query(`
      UPDATE production_units
      SET purpose = 'BATCH'
      WHERE scope = 'COMPANY'
         OR inventory_mode = 'AUTONOMOUS'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE production_units
      DROP COLUMN IF EXISTS purpose
    `);
  }
}
