import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecurringOperationalExpenses1757280000000
  implements MigrationInterface
{
  name = 'RecurringOperationalExpenses1757280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurring_operational_expenses_frequency_enum') THEN
          CREATE TYPE "recurring_operational_expenses_frequency_enum" AS ENUM (
            'WEEKLY', 'MONTHLY', 'YEARLY'
          );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurring_operational_expense_runs_status_enum') THEN
          CREATE TYPE "recurring_operational_expense_runs_status_enum" AS ENUM (
            'SUCCESS', 'FAILED'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recurring_operational_expenses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "branchId" uuid NULL,
        "name" varchar(120) NOT NULL,
        "description" text NULL,
        "categoryId" uuid NOT NULL,
        "supplierId" uuid NOT NULL,
        "documentKind" "operational_expenses_documentkind_enum" NOT NULL DEFAULT 'OTHER',
        "amountNet" numeric(15,2) NOT NULL,
        "taxAmount" numeric(15,2) NOT NULL DEFAULT 0,
        "total" numeric(15,2) NOT NULL,
        "taxId" uuid NULL,
        "frequency" "recurring_operational_expenses_frequency_enum" NOT NULL,
        "dayOfWeek" smallint NULL,
        "dayOfMonth" smallint NULL,
        "nextRunAt" TIMESTAMPTZ NOT NULL,
        "lastRunAt" TIMESTAMPTZ NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdBy" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_recurring_oe_company"
          FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_recurring_oe_category"
          FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_recurring_oe_supplier"
          FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_recurring_oe_created_by"
          FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_recurring_oe_due"
        ON "recurring_operational_expenses" ("isActive", "nextRunAt");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recurring_operational_expense_runs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "recurringExpenseId" uuid NOT NULL,
        "periodKey" varchar(32) NOT NULL,
        "operationalExpenseId" uuid NULL,
        "status" "recurring_operational_expense_runs_status_enum" NOT NULL,
        "errorMessage" text NULL,
        "ranAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_recurring_oe_run_period"
          UNIQUE ("recurringExpenseId", "periodKey"),
        CONSTRAINT "fk_recurring_oe_run_company"
          FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_recurring_oe_run_template"
          FOREIGN KEY ("recurringExpenseId") REFERENCES "recurring_operational_expenses"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_recurring_oe_run_expense"
          FOREIGN KEY ("operationalExpenseId") REFERENCES "operational_expenses"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_recurring_oe_runs_template"
        ON "recurring_operational_expense_runs" ("recurringExpenseId", "ranAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_operational_expense_runs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_operational_expenses"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "recurring_operational_expense_runs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "recurring_operational_expenses_frequency_enum"`,
    );
  }
}
