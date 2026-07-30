import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecurringOeAsTemplates1757400000000 implements MigrationInterface {
  name = 'RecurringOeAsTemplates1757400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "amountNet" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "taxAmount" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "total" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "frequency" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "nextRunAt" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ADD COLUMN IF NOT EXISTS "sourceOperationalExpenseId" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      DROP COLUMN IF EXISTS "sourceOperationalExpenseId"
    `);
    await queryRunner.query(`
      UPDATE "recurring_operational_expenses"
      SET "amountNet" = COALESCE("amountNet", 0),
          "taxAmount" = COALESCE("taxAmount", 0),
          "total" = COALESCE("total", 0.01),
          "frequency" = COALESCE("frequency", 'MONTHLY'),
          "nextRunAt" = COALESCE("nextRunAt", NOW())
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "amountNet" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "taxAmount" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "total" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "frequency" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_operational_expenses"
      ALTER COLUMN "nextRunAt" SET NOT NULL
    `);
  }
}
