import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grupo operativo CREDITOS (cuotas de crédito / financiamiento) en expense_categories.
 */
export class ExpenseCategoryOperationalGroupCreditos1757650000000
  implements MigrationInterface
{
  name = 'ExpenseCategoryOperationalGroupCreditos1757650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "expense_categories_operational_expense_group_enum"
          ADD VALUE IF NOT EXISTS 'CREDITOS';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // Postgres no permite quitar un valor de enum de forma segura sin recrear el tipo.
  }
}
