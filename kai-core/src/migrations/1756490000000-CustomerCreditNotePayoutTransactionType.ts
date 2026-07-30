import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tipo `CUSTOMER_CREDIT_NOTE_PAYOUT`: devolución en caja del saldo disponible
 * de notas de crédito al cliente (egreso, no cobro `PAYMENT_IN`).
 */
export class CustomerCreditNotePayoutTransactionType1756490000000
  implements MigrationInterface
{
  name = 'CustomerCreditNotePayoutTransactionType1756490000000';

  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'transactions_transactiontype_enum'
            AND e.enumlabel = 'CUSTOMER_CREDIT_NOTE_PAYOUT'
        ) THEN
          ALTER TYPE "transactions_transactiontype_enum"
            ADD VALUE 'CUSTOMER_CREDIT_NOTE_PAYOUT';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'accounting_rules_transactiontype_enum'
            AND e.enumlabel = 'CUSTOMER_CREDIT_NOTE_PAYOUT'
        ) THEN
          ALTER TYPE "accounting_rules_transactiontype_enum"
            ADD VALUE 'CUSTOMER_CREDIT_NOTE_PAYOUT';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE transactions
      SET "transactionType" = 'CUSTOMER_CREDIT_NOTE_PAYOUT'
      WHERE "transactionType" = 'PAYMENT_IN'
        AND metadata->>'source' = 'pos_nc_payout';
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL no permite eliminar valores de enum de forma portable.
  }
}
