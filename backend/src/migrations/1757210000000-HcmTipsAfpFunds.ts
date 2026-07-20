import { MigrationInterface, QueryRunner } from 'typeorm';

export class HcmTipsAfpFunds1757210000000 implements MigrationInterface {
  name = 'HcmTipsAfpFunds1757210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_afp_funds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        code varchar(32) NOT NULL,
        name varchar(150) NOT NULL,
        "contributionPercent" varchar(16) NOT NULL DEFAULT '0',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_afp_funds_company_code
      ON hr_afp_funds ("companyId", code)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_afp_funds_company
      ON hr_afp_funds ("companyId")
    `);

    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "tipsEligible" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "afpId" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "afpName" varchar(150) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      ADD COLUMN IF NOT EXISTS "afpContributionPercent" varchar(16) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "afpContributionPercent"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "afpName"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "afpId"
    `);
    await queryRunner.query(`
      ALTER TABLE hr_employment_contracts
      DROP COLUMN IF EXISTS "tipsEligible"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS hr_afp_funds`);
  }
}
