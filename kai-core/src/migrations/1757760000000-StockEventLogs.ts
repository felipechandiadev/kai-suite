import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registro de la aplicación de stock por transacción (idempotencia + visibilidad de
 * fallos). Una fila por transacción: APPLIED / SKIPPED (se aplicó o no correspondía) o
 * FAILED (falló y queda para reintento).
 */
export class StockEventLogs1757760000000 implements MigrationInterface {
  name = 'StockEventLogs1757760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_event_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "transaction_id" uuid NOT NULL,
        "status" varchar(12) NOT NULL DEFAULT 'PENDING',
        "attempts" integer NOT NULL DEFAULT 0,
        "last_error" text,
        "applied_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_event_logs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_stock_event_logs_transaction" UNIQUE ("transaction_id"),
        CONSTRAINT "FK_stock_event_logs_transaction" FOREIGN KEY ("transaction_id")
          REFERENCES "transactions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_event_logs_company_status"
        ON "stock_event_logs" ("company_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_event_logs"`);
  }
}
