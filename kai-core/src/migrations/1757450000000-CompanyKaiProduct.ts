import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Vertical comercial por empresa (KaiStore / KaiFood / KaiServices).
 * `kaisuite` es solo modo de deploy, no valor de columna.
 */
export class CompanyKaiProduct1757450000000 implements MigrationInterface {
  name = 'CompanyKaiProduct1757450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "kai_product" varchar(20) NOT NULL DEFAULT 'kaistore'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies" DROP COLUMN IF EXISTS "kai_product"
    `);
  }
}
