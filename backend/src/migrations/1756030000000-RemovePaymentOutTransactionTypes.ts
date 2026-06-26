import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reemplaza PAYMENT_OUT por tipos explícitos:
 * - SUPPLIER_PAYMENT (CxP proveedor)
 * - PAYROLL_PAYMENT (remuneraciones)
 * - BANK_TO_CASH_TRANSFER (tesorería banco → caja y restos)
 *
 * Asegura que el enum nativo de Postgres incluya los nuevos valores antes
 * de los UPDATE (bases creadas antes de que existieran en el tipo).
 */
export class RemovePaymentOutTransactionTypes1756030000000
  implements MigrationInterface
{
  name = 'RemovePaymentOutTransactionTypes1756030000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        udt text;
        is_enum boolean;
      BEGIN
        SELECT c.udt_name INTO udt
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'transactions'
          AND lower(c.column_name) IN ('transactiontype', 'transaction_type')
        LIMIT 1;

        IF udt IS NULL THEN
          RAISE NOTICE 'transactions.transactionType: columna no encontrada; se omiten ADD VALUE';
          RETURN;
        END IF;

        SELECT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = udt
            AND n.nspname = 'public'
            AND t.typtype = 'e'
        ) INTO is_enum;

        IF NOT is_enum THEN
          RAISE NOTICE 'transactions.transactionType no es enum PG; se omiten ADD VALUE';
          RETURN;
        END IF;

        EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', udt, 'BANK_TO_CASH_TRANSFER');
        EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', udt, 'SUPPLIER_PAYMENT');
        EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', udt, 'PAYROLL_PAYMENT');
      END $$;
    `);

    // 1) Tesorería banco→caja (antes no pisar filas con supplierId que sean este flujo)
    await queryRunner.query(`
      UPDATE "transactions"
      SET "transactionType" = 'BANK_TO_CASH_TRANSFER'
      WHERE "transactionType"::text = 'PAYMENT_OUT'
        AND COALESCE("metadata"::jsonb ->> 'bankToCashTransfer', 'false') IN ('true', 'True', '1')
    `);

    // 2) Pagos a proveedor
    await queryRunner.query(`
      UPDATE "transactions"
      SET "transactionType" = 'SUPPLIER_PAYMENT'
      WHERE "transactionType"::text = 'PAYMENT_OUT'
        AND "supplierId" IS NOT NULL
    `);

    // 3) Pagos de remuneraciones
    await queryRunner.query(`
      UPDATE "transactions"
      SET "transactionType" = 'PAYROLL_PAYMENT'
      WHERE "transactionType"::text = 'PAYMENT_OUT'
        AND "employeeId" IS NOT NULL
    `);

    // 4) Restos (legacy sin clasificar)
    await queryRunner.query(`
      UPDATE "transactions"
      SET "transactionType" = 'BANK_TO_CASH_TRANSFER'
      WHERE "transactionType"::text = 'PAYMENT_OUT'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Reversión no determinística: no restaurar PAYMENT_OUT automáticamente.
  }
}
