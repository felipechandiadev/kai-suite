import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes gratification from employment contracts / jornada defaults.
 * Payroll line type GRATIFICATION is unrelated and kept.
 */
export class DropEmploymentContractGratification1757190000000
  implements MigrationInterface
{
  name = 'DropEmploymentContractGratification1757190000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "gratificationMode"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      DROP COLUMN IF EXISTS "defaultGratificationMode"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr_jornada_config
      ADD COLUMN IF NOT EXISTS "defaultGratificationMode" varchar(32) NOT NULL DEFAULT 'NONE'
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "gratificationMode" varchar(32) NOT NULL DEFAULT 'NONE'
    `);
  }
}
