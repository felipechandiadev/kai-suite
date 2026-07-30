import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El seed mínimo crea una regla contable para el tipo de transacción
 * `CASH_SESSION_TO_HUB_TRANSFER`. El enum de `transactions` ya se extiende en
 * `1741000000000-CashHubsAndSessionToHub.ts`, pero el enum de `accounting_rules`
 * puede quedar desincronizado en DB (PostgreSQL crea un enum separado por tabla/columna).
 *
 * Esta migración agrega el valor al enum `accounting_rules_transactiontype_enum`.
 *
 * `transaction = false`: ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de
 * una transacción en algunas versiones/configuraciones de PostgreSQL.
 */
export class AddCashSessionToHubTransferAccountingRuleEnum1741100000000
  implements MigrationInterface
{
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "accounting_rules_transactiontype_enum"
        ADD VALUE 'CASH_SESSION_TO_HUB_TRANSFER';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL no permite eliminar valores de enum de forma portable.
  }
}

