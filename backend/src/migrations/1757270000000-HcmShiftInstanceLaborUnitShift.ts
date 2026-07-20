import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persist laborUnitShiftId on shift instances so UL shifts with same hours stay distinct.
 */
export class HcmShiftInstanceLaborUnitShift1757270000000
  implements MigrationInterface
{
  name = 'HcmShiftInstanceLaborUnitShift1757270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr_shift_instances
      ADD COLUMN IF NOT EXISTS "laborUnitShiftId" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_shift_instances_ul_shift
      ON hr_shift_instances ("laborUnitShiftId")
      WHERE "laborUnitShiftId" IS NOT NULL AND "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_hr_shift_instances_ul_shift
    `);
    await queryRunner.query(`
      ALTER TABLE hr_shift_instances
      DROP COLUMN IF EXISTS "laborUnitShiftId"
    `);
  }
}
