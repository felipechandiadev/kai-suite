import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tipo `BACKORDER`: reserva de cliente con anticipo (`metadata.backorder`),
 * sin movimiento de stock por sí solo.
 *
 * Extiende:
 * - `transactions_transactiontype_enum`
 * - `accounting_rules_transactiontype_enum` (TypeORM enum separado en PG)
 *
 * `transaction = false`: `ALTER TYPE ... ADD VALUE` no puede ir dentro de
 * una transacción en algunas configuraciones de PostgreSQL.
 */
export class BackorderTransactionType1756050000000 implements MigrationInterface {
  name = 'BackorderTransactionType1756050000000';

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
            AND e.enumlabel = 'BACKORDER'
        ) THEN
          ALTER TYPE "transactions_transactiontype_enum" ADD VALUE 'BACKORDER';
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
            AND e.enumlabel = 'BACKORDER'
        ) THEN
          ALTER TYPE "accounting_rules_transactiontype_enum" ADD VALUE 'BACKORDER';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL no permite eliminar valores de enum de forma portable.
  }
}
