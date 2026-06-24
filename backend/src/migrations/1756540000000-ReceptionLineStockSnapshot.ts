import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceptionLineStockSnapshot1756540000000 implements MigrationInterface {
  name = 'ReceptionLineStockSnapshot1756540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reception_lines"
      ADD COLUMN IF NOT EXISTS "storagePhysicalBefore" numeric(18,6) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "reception_lines"
      ADD COLUMN IF NOT EXISTS "storagePhysicalAfter" numeric(18,6) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reception_lines" DROP COLUMN IF EXISTS "storagePhysicalAfter";
    `);
    await queryRunner.query(`
      ALTER TABLE "reception_lines" DROP COLUMN IF EXISTS "storagePhysicalBefore";
    `);
  }
}
