import { MigrationInterface, QueryRunner } from 'typeorm';

export class PresaleTickets1756560000000 implements MigrationInterface {
  name = 'PresaleTickets1756560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "presale_ticket_status_enum" AS ENUM ('READY', 'REDEEMED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TABLE "presale_tickets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "code" varchar(32) NOT NULL,
        "status" "presale_ticket_status_enum" NOT NULL DEFAULT 'READY',
        "presale_point_of_sale_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "price_list_id" uuid NOT NULL,
        "customer_id" uuid,
        "customer_name" varchar(255),
        "customer_document" varchar(64),
        "subtotal" numeric(18,4) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,4) NOT NULL DEFAULT 0,
        "discount_amount" numeric(18,4) NOT NULL DEFAULT 0,
        "total" numeric(18,4) NOT NULL DEFAULT 0,
        "promotions_snapshot" jsonb,
        "created_by_user_id" uuid,
        "redeemed_at" TIMESTAMPTZ,
        "redeemed_transaction_id" uuid,
        "redeemed_point_of_sale_id" uuid,
        "cancelled_at" TIMESTAMPTZ,
        "cancelled_by_user_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_presale_tickets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_presale_tickets_company_code" UNIQUE ("company_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_presale_tickets_company_id" ON "presale_tickets" ("company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_presale_tickets_status" ON "presale_tickets" ("company_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_presale_tickets_branch" ON "presale_tickets" ("company_id", "branch_id", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "presale_ticket_lines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "presale_ticket_id" uuid NOT NULL,
        "line_number" int NOT NULL,
        "product_id" uuid,
        "product_variant_id" uuid,
        "product_name" varchar(255) NOT NULL,
        "product_sku" varchar(128),
        "variant_name" varchar(255),
        "quantity" numeric(18,4) NOT NULL DEFAULT 0,
        "unit_price" numeric(18,4) NOT NULL DEFAULT 0,
        "discount_amount" numeric(18,4) NOT NULL DEFAULT 0,
        "tax_rate" numeric(8,4) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,4) NOT NULL DEFAULT 0,
        "subtotal" numeric(18,4) NOT NULL DEFAULT 0,
        "total" numeric(18,4) NOT NULL DEFAULT 0,
        "unit_of_measure" varchar(32),
        "promotion_snapshot" jsonb,
        CONSTRAINT "PK_presale_ticket_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_presale_ticket_lines_ticket"
          FOREIGN KEY ("presale_ticket_id") REFERENCES "presale_tickets"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_presale_ticket_lines_ticket" ON "presale_ticket_lines" ("presale_ticket_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "presale_ticket_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "presale_tickets"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "presale_ticket_status_enum"`);
  }
}
