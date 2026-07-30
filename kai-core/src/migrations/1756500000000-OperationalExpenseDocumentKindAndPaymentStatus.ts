import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gastos operativos: tipo de documento, estado de pago y vínculos a transacciones.
 */
export class OperationalExpenseDocumentKindAndPaymentStatus1756500000000
  implements MigrationInterface
{
  name = 'OperationalExpenseDocumentKindAndPaymentStatus1756500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operational_expenses_documentkind_enum') THEN
          CREATE TYPE "operational_expenses_documentkind_enum" AS ENUM (
            'SUPPLIER_INVOICE',
            'SUPPLIER_RECEIPT',
            'SUPPLIER_HONORARIUM_RECEIPT',
            'OTHER'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "operational_expenses"
        ADD COLUMN IF NOT EXISTS "documentKind" "operational_expenses_documentkind_enum" NULL,
        ADD COLUMN IF NOT EXISTS "paymentStatus" varchar(30) NULL,
        ADD COLUMN IF NOT EXISTS "supplierFiscalDocumentTransactionId" uuid NULL,
        ADD COLUMN IF NOT EXISTS "operatingExpenseTransactionId" uuid NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_operational_expenses_fiscal_doc"
        ON "operational_expenses" ("supplierFiscalDocumentTransactionId")
        WHERE "supplierFiscalDocumentTransactionId" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_operational_expenses_op_tx"
        ON "operational_expenses" ("operatingExpenseTransactionId")
        WHERE "operatingExpenseTransactionId" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operational_expenses"
        DROP COLUMN IF EXISTS "operatingExpenseTransactionId",
        DROP COLUMN IF EXISTS "supplierFiscalDocumentTransactionId",
        DROP COLUMN IF EXISTS "paymentStatus",
        DROP COLUMN IF EXISTS "documentKind";
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "operational_expenses_documentkind_enum";
    `);
  }
}
