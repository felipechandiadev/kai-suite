import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SupplierInvoiceEnumBootstrap implements OnModuleInit {
  private readonly logger = new Logger(SupplierInvoiceEnumBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    // In Postgres, Transaction.transactionType is an enum. In dev, TypeORM synchronize
    // may not evolve enums automatically, so we ensure SUPPLIER_INVOICE exists.
    try {
      await this.dataSource.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'transactions_transactiontype_enum'
      AND e.enumlabel = 'SUPPLIER_INVOICE'
  ) THEN
    ALTER TYPE transactions_transactiontype_enum ADD VALUE 'SUPPLIER_INVOICE';
  END IF;
END $$;
      `);
    } catch (err) {
      // Non-fatal: environments without Postgres enums or where value already exists.
      this.logger.warn(
        `Could not ensure SUPPLIER_INVOICE enum value: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    try {
      await this.dataSource.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'transactions_transactiontype_enum'
      AND e.enumlabel = 'SUPPLIER_CREDIT_NOTE'
  ) THEN
    ALTER TYPE transactions_transactiontype_enum ADD VALUE 'SUPPLIER_CREDIT_NOTE';
  END IF;
END $$;
      `);
    } catch (err) {
      this.logger.warn(
        `Could not ensure SUPPLIER_CREDIT_NOTE enum value: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      await this.dataSource.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'transactions_transactiontype_enum'
      AND e.enumlabel = 'CUSTOMER_CREDIT_NOTE'
  ) THEN
    ALTER TYPE transactions_transactiontype_enum ADD VALUE 'CUSTOMER_CREDIT_NOTE';
  END IF;
END $$;
      `);
    } catch (err) {
      this.logger.warn(
        `Could not ensure CUSTOMER_CREDIT_NOTE enum value: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    for (const label of [
      'SUPPLIER_RECEIPT',
      'SUPPLIER_HONORARIUM_RECEIPT',
      'SUPPLIER_GUIDE',
    ] as const) {
      try {
        await this.dataSource.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'transactions_transactiontype_enum'
      AND e.enumlabel = '${label}'
  ) THEN
    ALTER TYPE transactions_transactiontype_enum ADD VALUE '${label}';
  END IF;
END $$;
        `);
      } catch (err) {
        this.logger.warn(
          `Could not ensure ${label} enum value: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}

