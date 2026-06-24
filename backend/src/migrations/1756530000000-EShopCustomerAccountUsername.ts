import { MigrationInterface, QueryRunner } from 'typeorm';

export class EShopCustomerAccountUsername1756530000000 implements MigrationInterface {
  name = 'EShopCustomerAccountUsername1756530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "eshop_customer_accounts"
      ADD COLUMN IF NOT EXISTS "username" character varying(30);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_eshop_customer_accounts_company_username"
      ON "eshop_customer_accounts" ("company_id", "username")
      WHERE "username" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_eshop_customer_accounts_company_username";
    `);
    await queryRunner.query(`
      ALTER TABLE "eshop_customer_accounts" DROP COLUMN IF EXISTS "username";
    `);
  }
}
