import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Centros de acopio (cash hubs), vínculos sucursal/POS, hub por defecto en POS,
 * columna cashHubId en transacciones y nuevo valor de enum de tipo de transacción.
 *
 * `transaction = false`: ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de
 * una transacción en algunas versiones de PostgreSQL con ciertos drivers.
 */
export class CashHubsAndSessionToHub1741000000000 implements MigrationInterface {
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cash_hubs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "code" character varying(60),
        "isActive" boolean NOT NULL DEFAULT true,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cash_hubs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cash_hubs_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cash_hub_branches" (
        "cashHubId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        CONSTRAINT "PK_cash_hub_branches" PRIMARY KEY ("cashHubId", "branchId"),
        CONSTRAINT "FK_cash_hub_branches_hub" FOREIGN KEY ("cashHubId") REFERENCES "cash_hubs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cash_hub_branches_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cash_hub_points_of_sale" (
        "cashHubId" uuid NOT NULL,
        "pointOfSaleId" uuid NOT NULL,
        CONSTRAINT "PK_cash_hub_points_of_sale" PRIMARY KEY ("cashHubId", "pointOfSaleId"),
        CONSTRAINT "FK_cash_hub_pos_hub" FOREIGN KEY ("cashHubId") REFERENCES "cash_hubs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cash_hub_pos_pos" FOREIGN KEY ("pointOfSaleId") REFERENCES "points_of_sale"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "points_of_sale"
      ADD COLUMN IF NOT EXISTS "defaultCashHubId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "points_of_sale"
      ADD CONSTRAINT "FK_points_of_sale_default_cash_hub"
      FOREIGN KEY ("defaultCashHubId") REFERENCES "cash_hubs"("id") ON DELETE SET NULL
    `).catch(() => {
      /* constraint may already exist */
    });

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN IF NOT EXISTS "cashHubId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_cash_hub"
      FOREIGN KEY ("cashHubId") REFERENCES "cash_hubs"("id") ON DELETE SET NULL
    `).catch(() => {
      /* constraint may already exist */
    });

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "transactions_transactiontype_enum" ADD VALUE 'CASH_SESSION_TO_HUB_TRANSFER';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_cash_hub"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN IF EXISTS "cashHubId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "points_of_sale" DROP CONSTRAINT IF EXISTS "FK_points_of_sale_default_cash_hub"`,
    );
    await queryRunner.query(
      `ALTER TABLE "points_of_sale" DROP COLUMN IF EXISTS "defaultCashHubId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_hub_points_of_sale"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_hub_branches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_hubs"`);
    /* No se elimina el valor del enum en PostgreSQL de forma portable */
  }
}
