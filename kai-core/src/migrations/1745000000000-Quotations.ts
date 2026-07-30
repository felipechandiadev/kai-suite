import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soporte de cotizaciones:
 *
 *  - Agrega `QUOTATION` al enum `transactions_transactiontype_enum`.
 *  - Agrega `EXPIRED` al enum `transactions_status_enum`.
 *
 * Las cotizaciones reutilizan las tablas `transactions` y
 * `transaction_lines`, por lo que no se crean nuevas tablas. La
 * configuración por empresa (vigencia, términos, etc.) se persiste en
 * `companies.settings.quotations` (columna JSON existente) y no requiere
 * cambios de schema.
 *
 * `transaction = false`: ALTER TYPE ... ADD VALUE no puede ejecutarse
 * dentro de una transacción en Postgres.
 */
export class Quotations1745000000000 implements MigrationInterface {
  name = 'Quotations1745000000000';

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
            AND e.enumlabel = 'QUOTATION'
        ) THEN
          ALTER TYPE "transactions_transactiontype_enum" ADD VALUE 'QUOTATION';
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
          WHERE t.typname = 'transactions_status_enum'
            AND e.enumlabel = 'EXPIRED'
        ) THEN
          ALTER TYPE "transactions_status_enum" ADD VALUE 'EXPIRED';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL no permite eliminar valores de enum de forma portable.
  }
}
