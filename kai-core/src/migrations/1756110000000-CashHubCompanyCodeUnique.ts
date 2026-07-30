import { MigrationInterface, QueryRunner } from 'typeorm';

export class CashHubCompanyCodeUnique1756110000000 implements MigrationInterface {
  name = 'CashHubCompanyCodeUnique1756110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cash_hubs_company_code"
        ON "cash_hubs" ("companyId", "code")
        WHERE "code" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_cash_hubs_company_code";`);
  }
}
