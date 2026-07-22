import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpenseCategoryNonDeletable1757390000000
  implements MigrationInterface
{
  name = 'ExpenseCategoryNonDeletable1757390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "expense_categories"
      ADD COLUMN IF NOT EXISTS "nonDeletable" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "expense_categories"
      SET "nonDeletable" = true
      WHERE "deletedAt" IS NULL
        AND "name" IN ('Sueldos', 'Horas extra', 'Cargas sociales')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "expense_categories"
      DROP COLUMN IF EXISTS "nonDeletable"
    `);
  }
}
