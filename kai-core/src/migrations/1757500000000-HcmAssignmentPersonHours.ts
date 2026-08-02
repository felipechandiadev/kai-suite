import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Person jornada hours on the assignment; instance times remain the UL shift band.
 */
export class HcmAssignmentPersonHours1757500000000
  implements MigrationInterface
{
  name = 'HcmAssignmentPersonHours1757500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr_shift_assignments
      ADD COLUMN IF NOT EXISTS "startTime" varchar(5) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_shift_assignments
      ADD COLUMN IF NOT EXISTS "endTime" varchar(5) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr_shift_assignments
      DROP COLUMN IF EXISTS "endTime"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_shift_assignments
      DROP COLUMN IF EXISTS "startTime"
    `);
  }
}
