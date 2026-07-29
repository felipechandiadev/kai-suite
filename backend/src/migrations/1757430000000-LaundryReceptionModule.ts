import { MigrationInterface, QueryRunner } from 'typeorm';

export class LaundryReceptionModule1757430000000 implements MigrationInterface {
  name = 'LaundryReceptionModule1757430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "laundry_garment_types" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "code" varchar(64) NOT NULL,
        "name" varchar(255) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_laundry_garment_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_laundry_garment_types_company_code" UNIQUE ("company_id", "code")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_garment_types_company_id"
      ON "laundry_garment_types" ("company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "laundry_garment_attributes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "code" varchar(64) NOT NULL,
        "name" varchar(255) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_laundry_garment_attributes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_laundry_garment_attributes_company_code" UNIQUE ("company_id", "code")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_garment_attributes_company_id"
      ON "laundry_garment_attributes" ("company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "laundry_garment_attribute_values" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "attribute_id" uuid NOT NULL,
        "label" varchar(255) NOT NULL,
        "sort_order" int NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_laundry_garment_attribute_values" PRIMARY KEY ("id"),
        CONSTRAINT "FK_laundry_garment_attribute_values_attribute"
          FOREIGN KEY ("attribute_id") REFERENCES "laundry_garment_attributes"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_garment_attribute_values_attribute_id"
      ON "laundry_garment_attribute_values" ("attribute_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "laundry_care_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "label" varchar(255) NOT NULL,
        "text" text NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_laundry_care_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_care_templates_company_id"
      ON "laundry_care_templates" ("company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "laundry_receptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "point_of_sale_id" uuid,
        "user_id" uuid NOT NULL,
        "code" varchar(32),
        "customer_id" uuid NOT NULL,
        "customer_name_snapshot" varchar(255) NOT NULL,
        "customer_phone_snapshot" varchar(64),
        "status" varchar(32) NOT NULL DEFAULT 'DRAFT',
        "payment_mode" varchar(32) NOT NULL DEFAULT 'FULL_ON_PICKUP',
        "deposit_amount" numeric(18,4) NOT NULL DEFAULT 0,
        "paid_amount" numeric(18,4) NOT NULL DEFAULT 0,
        "balance_due" numeric(18,4) NOT NULL DEFAULT 0,
        "services_total" numeric(18,4) NOT NULL DEFAULT 0,
        "received_at" TIMESTAMPTZ,
        "promised_at" TIMESTAMPTZ,
        "ready_at" TIMESTAMPTZ,
        "delivered_at" TIMESTAMPTZ,
        "notes" text,
        "sale_transaction_id" uuid,
        "deposit_transaction_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_laundry_receptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_laundry_receptions_branch_code" UNIQUE ("branch_id", "code")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_receptions_company_id"
      ON "laundry_receptions" ("company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_receptions_branch_id"
      ON "laundry_receptions" ("branch_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_receptions_status"
      ON "laundry_receptions" ("company_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_receptions_customer"
      ON "laundry_receptions" ("company_id", "customer_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "laundry_reception_garments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reception_id" uuid NOT NULL,
        "garment_type_id" uuid NOT NULL,
        "quantity" numeric(18,4) NOT NULL DEFAULT 1,
        "attribute_values" jsonb NOT NULL DEFAULT '[]',
        "care_instructions" text,
        "customer_notes" text,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_laundry_reception_garments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_laundry_reception_garments_reception"
          FOREIGN KEY ("reception_id") REFERENCES "laundry_receptions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_reception_garments_reception_id"
      ON "laundry_reception_garments" ("reception_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "laundry_reception_service_lines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reception_id" uuid NOT NULL,
        "garment_id" uuid NOT NULL,
        "product_variant_id" uuid NOT NULL,
        "quantity" numeric(18,4) NOT NULL DEFAULT 0,
        "unit_price" numeric(18,4) NOT NULL DEFAULT 0,
        "line_total" numeric(18,4) NOT NULL DEFAULT 0,
        "notes" text,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_laundry_reception_service_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_laundry_reception_service_lines_reception"
          FOREIGN KEY ("reception_id") REFERENCES "laundry_receptions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_laundry_reception_service_lines_garment"
          FOREIGN KEY ("garment_id") REFERENCES "laundry_reception_garments"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_reception_service_lines_reception_id"
      ON "laundry_reception_service_lines" ("reception_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_laundry_reception_service_lines_garment_id"
      ON "laundry_reception_service_lines" ("garment_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "laundry_reception_service_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "laundry_reception_garments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "laundry_receptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "laundry_care_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "laundry_garment_attribute_values"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "laundry_garment_attributes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "laundry_garment_types"`);
  }
}
