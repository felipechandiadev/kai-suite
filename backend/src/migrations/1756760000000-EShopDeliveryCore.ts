import { MigrationInterface, QueryRunner } from 'typeorm';

export class EShopDeliveryCore1756760000000 implements MigrationInterface {
  name = 'EShopDeliveryCore1756760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_coverage_communes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "code" varchar(64) NOT NULL,
        "name" varchar(120) NOT NULL,
        "province" varchar(120) NOT NULL,
        "region_code" varchar(64) NOT NULL DEFAULT 'maule',
        "is_enabled" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_coverage_communes" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_e_shop_delivery_communes_company_code"
      ON "e_shop_delivery_coverage_communes" ("company_id", "code");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_zones" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "shipping_fee" numeric(15,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        "commune_code" varchar(64),
        "geom" geometry(Polygon, 4326),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_zones" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_occurrences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "occurrence_date" date NOT NULL,
        "departure_time" time NOT NULL,
        "order_cutoff_time" time NOT NULL,
        "max_orders" int,
        "driver_user_id" uuid,
        "is_cancelled" boolean NOT NULL DEFAULT false,
        "route_status" varchar(40) NOT NULL DEFAULT 'planned',
        "total_distance_m" int,
        "total_duration_s" int,
        "route_geometry" jsonb,
        "route_optimized_at" timestamptz,
        "route_started_at" timestamptz,
        "route_completed_at" timestamptz,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_occurrences" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_occurrence_zones" (
        "occurrence_id" uuid NOT NULL,
        "zone_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        CONSTRAINT "PK_e_shop_delivery_occurrence_zones" PRIMARY KEY ("occurrence_id", "zone_id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "transaction_id" uuid NOT NULL,
        "fulfillment_type" varchar(32) NOT NULL DEFAULT 'LOCAL_DELIVERY',
        "delivery_zone_id" uuid,
        "delivery_occurrence_id" uuid,
        "delivery_dispatch_id" uuid,
        "delivery_status" varchar(40) NOT NULL DEFAULT 'SUBMITTED',
        "address_line1" varchar(255),
        "commune" varchar(120),
        "region" varchar(120),
        "latitude" double precision,
        "longitude" double precision,
        "delivery_point" geometry(Point, 4326),
        "shipping_fee" numeric(15,2) NOT NULL DEFAULT 0,
        "customer_name" varchar(255),
        "customer_phone" varchar(64),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_orders" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_e_shop_delivery_orders_transaction"
      ON "e_shop_delivery_orders" ("transaction_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_dispatches" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "occurrence_id" uuid NOT NULL,
        "driver_user_id" uuid,
        "label" varchar(120),
        "status" varchar(40) NOT NULL DEFAULT 'planned',
        "total_distance_m" int,
        "total_duration_s" int,
        "route_geometry" jsonb,
        "route_optimized_at" timestamptz,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_dispatches" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_stops" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "dispatch_id" uuid NOT NULL,
        "delivery_order_id" uuid NOT NULL,
        "transaction_id" uuid NOT NULL,
        "sequence" int NOT NULL,
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "eta_at" timestamptz,
        "stop_status" varchar(32) NOT NULL DEFAULT 'pending',
        "visited_at" timestamptz,
        "issue_note" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_stops" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_settings" (
        "company_id" uuid NOT NULL,
        "depot_lat" double precision,
        "depot_lng" double precision,
        "depot_address" varchar(255),
        "region_code" varchar(64) NOT NULL DEFAULT 'maule',
        "local_delivery_enabled" boolean NOT NULL DEFAULT false,
        "osrm_url" varchar(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_settings" PRIMARY KEY ("company_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_delivery_stops"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_delivery_dispatches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_delivery_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_delivery_occurrence_zones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_delivery_occurrences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_delivery_zones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_delivery_coverage_communes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "e_shop_delivery_settings"`);
  }
}
