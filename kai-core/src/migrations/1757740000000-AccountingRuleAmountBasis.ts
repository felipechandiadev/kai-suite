import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountingRuleAmountBasis1757740000000 implements MigrationInterface {
  name = 'AccountingRuleAmountBasis1757740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounting_rules"
        ADD COLUMN IF NOT EXISTS "amountBasis" varchar(20) NOT NULL DEFAULT 'LINE_TOTAL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounting_rules" DROP COLUMN IF EXISTS "amountBasis"
    `);
  }
}
