import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmploymentContractGenerationalLaguna1757410000000
  implements MigrationInterface
{
  name = 'EmploymentContractGeneracionalLaguna1757410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hr_employment_contracts"
      ADD COLUMN IF NOT EXISTS "generational_fund" varchar(64) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "hr_employment_contracts"
      ADD COLUMN IF NOT EXISTS "laguna_insurance_covered" boolean NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hr_employment_contracts"
      DROP COLUMN IF EXISTS "laguna_insurance_covered"
    `);
    await queryRunner.query(`
      ALTER TABLE "hr_employment_contracts"
      DROP COLUMN IF EXISTS "generational_fund"
    `);
  }
}
