import { MigrationInterface, QueryRunner } from 'typeorm';

export class TipLedgerEntries1757610000000 implements MigrationInterface {
  name = 'TipLedgerEntries1757610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tip_ledger_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "branchId" uuid NULL,
        "saleTransactionId" uuid NOT NULL,
        "diningOrderId" uuid NULL,
        amount numeric(15,2) NOT NULL DEFAULT 0,
        status varchar(16) NOT NULL DEFAULT 'ACCRUED',
        "tipStatus" varchar(16) NOT NULL DEFAULT 'NONE',
        "suggestPercent" numeric(5,2) NULL,
        "suggestedAmount" numeric(15,2) NULL,
        "paymentMethod" varchar(32) NULL,
        "employeeId" uuid NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tip_ledger_sale_tx"
      ON tip_ledger_entries ("saleTransactionId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tip_ledger_company_created"
      ON tip_ledger_entries ("companyId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tip_ledger_company_status"
      ON tip_ledger_entries ("companyId", status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tip_ledger_entries`);
  }
}
