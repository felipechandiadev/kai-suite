import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Asegura columnas Track A en `tip_ledger_entries` y enums TIP_PAYOUT
 * cuando la migración 175762 no está aplicada (dev/seed sin migration:run).
 */
@Injectable()
export class TipsSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(TipsSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      const table = await this.dataSource.query<{ exists: boolean }[]>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'tip_ledger_entries'
         ) AS exists`,
      );
      if (!table?.[0]?.exists) {
        this.logger.warn(
          'tip_ledger_entries missing; skip Track A column bootstrap (run TipLedgerEntries migration)',
        );
        return;
      }

      await this.dataSource.query(`
        ALTER TABLE tip_ledger_entries
          ADD COLUMN IF NOT EXISTS "amountPaid" numeric(15,2) NOT NULL DEFAULT 0
      `);
      await this.dataSource.query(`
        ALTER TABLE tip_ledger_entries
          ADD COLUMN IF NOT EXISTS "dueAt" timestamptz NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE tip_ledger_entries
          ADD COLUMN IF NOT EXISTS "attributedAt" timestamptz NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE tip_ledger_entries
          ADD COLUMN IF NOT EXISTS "payoutTransactionId" uuid NULL
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IDX_tip_ledger_company_due"
        ON tip_ledger_entries ("companyId", "dueAt")
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IDX_tip_ledger_company_employee"
        ON tip_ledger_entries ("companyId", "employeeId")
      `);

      for (const enumName of [
        'transactions_transactiontype_enum',
        'accounting_rules_transactiontype_enum',
      ]) {
        for (const value of ['TIP_PAYOUT', 'TIP_PAYOUT_LINE']) {
          await this.dataSource.query(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                WHERE t.typname = '${enumName}'
                  AND e.enumlabel = '${value}'
              ) THEN
                ALTER TYPE "${enumName}" ADD VALUE '${value}';
              END IF;
            END $$;
          `);
        }
      }

      this.logger.log('tip_ledger_entries Track A columns + TIP_PAYOUT enums OK');
    } catch (err) {
      this.logger.error(
        `Tips schema bootstrap failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }
}
