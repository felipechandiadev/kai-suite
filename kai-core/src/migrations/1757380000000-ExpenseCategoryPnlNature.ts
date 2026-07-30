import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpenseCategoryPnlNature1757380000000
  implements MigrationInterface
{
  name = 'ExpenseCategoryPnlNature1757380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'expense_categories_pnl_nature_enum'
        ) THEN
          CREATE TYPE "expense_categories_pnl_nature_enum" AS ENUM ('SALES', 'ADMIN');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "expense_categories"
      ADD COLUMN IF NOT EXISTS "pnl_nature" "expense_categories_pnl_nature_enum"
        NOT NULL DEFAULT 'ADMIN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "expense_categories"
      DROP COLUMN IF EXISTS "pnl_nature"
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "expense_categories_pnl_nature_enum"
    `);
  }
}
