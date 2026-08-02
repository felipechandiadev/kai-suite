import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Track A propinas: saldos (amountPaid), plazo 7 días (dueAt), atribución,
 * vínculo a lote de pago, y tipo TIP_PAYOUT en enums Postgres.
 */
export class TipLedgerTrackA1757620000000 implements MigrationInterface {
  name = 'TipLedgerTrackA1757620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tip_ledger_entries
        ADD COLUMN IF NOT EXISTS "amountPaid" numeric(15,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE tip_ledger_entries
        ADD COLUMN IF NOT EXISTS "dueAt" timestamptz NULL
    `);
    await queryRunner.query(`
      ALTER TABLE tip_ledger_entries
        ADD COLUMN IF NOT EXISTS "attributedAt" timestamptz NULL
    `);
    await queryRunner.query(`
      ALTER TABLE tip_ledger_entries
        ADD COLUMN IF NOT EXISTS "payoutTransactionId" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tip_ledger_company_due"
      ON tip_ledger_entries ("companyId", "dueAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tip_ledger_company_employee"
      ON tip_ledger_entries ("companyId", "employeeId")
    `);

    for (const enumName of [
      'transactions_transactiontype_enum',
      'accounting_rules_transactiontype_enum',
    ]) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = '${enumName}'
              AND e.enumlabel = 'TIP_PAYOUT'
          ) THEN
            ALTER TYPE "${enumName}" ADD VALUE 'TIP_PAYOUT';
          END IF;
        END $$;
      `);
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = '${enumName}'
              AND e.enumlabel = 'TIP_PAYOUT_LINE'
          ) THEN
            ALTER TYPE "${enumName}" ADD VALUE 'TIP_PAYOUT_LINE';
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tip_ledger_company_employee"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tip_ledger_company_due"`,
    );
    await queryRunner.query(`
      ALTER TABLE tip_ledger_entries
        DROP COLUMN IF EXISTS "payoutTransactionId",
        DROP COLUMN IF EXISTS "attributedAt",
        DROP COLUMN IF EXISTS "dueAt",
        DROP COLUMN IF EXISTS "amountPaid"
    `);
  }
}
