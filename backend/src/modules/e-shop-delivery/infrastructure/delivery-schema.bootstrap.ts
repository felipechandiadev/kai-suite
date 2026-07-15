import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  hasDeliveryGeomColumns,
  isPostgisInstalled,
  POSTGIS_REQUIRED_MESSAGE,
} from './postgis.support';

@Injectable()
export class DeliverySchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(DeliverySchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    const hasPostgis = await isPostgisInstalled(this.dataSource);
    if (!hasPostgis) {
      // Intentamos crear la extensión solo si el rol tiene permiso (p.ej. superuser en Docker limpio).
      try {
        await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
      } catch (err) {
        this.logger.error(
          `PostGIS ausente y no se pudo crear la extensión (${String(err)}). ${POSTGIS_REQUIRED_MESSAGE}`,
        );
      }
    }

    const postgisReady = await isPostgisInstalled(this.dataSource);

    try {
      await this.ensureCoreTables();

      if (postgisReady) {
        await this.ensureGeometryColumns();
        await this.ensureSpatialIndexes();
        const columnsOk = await hasDeliveryGeomColumns(this.dataSource);
        if (columnsOk) {
          this.logger.log('eShop delivery schema bootstrap OK (PostGIS + geom)');
        } else {
          this.logger.error(
            `PostGIS instalado pero faltan columnas espaciales. Corre migraciones. ${POSTGIS_REQUIRED_MESSAGE}`,
          );
        }
      } else {
        this.logger.error(
          `Tablas delivery creadas SIN columnas geometry. ${POSTGIS_REQUIRED_MESSAGE}`,
        );
      }
    } catch (err) {
      this.logger.warn(`eShop delivery schema bootstrap skipped: ${String(err)}`);
    }
  }

  private async ensureCoreTables() {
    await this.dataSource.query(`
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

    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_e_shop_delivery_communes_company_code"
      ON "e_shop_delivery_coverage_communes" ("company_id", "code");
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_zones" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "shipping_fee" numeric(15,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        "commune_code" varchar(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_zones" PRIMARY KEY ("id")
      );
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_occurrences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "kind" varchar(32) NOT NULL DEFAULT 'LOCAL_DELIVERY',
        "occurrence_date" date NOT NULL,
        "departure_time" time NOT NULL,
        "end_time" time,
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

    await this.dataSource.query(`
      ALTER TABLE "e_shop_delivery_occurrences"
      ADD COLUMN IF NOT EXISTS "kind" varchar(32) NOT NULL DEFAULT 'LOCAL_DELIVERY'
    `);
    await this.dataSource.query(`
      ALTER TABLE "e_shop_delivery_occurrences"
      ADD COLUMN IF NOT EXISTS "end_time" time
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_occurrence_zones" (
        "occurrence_id" uuid NOT NULL,
        "zone_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        CONSTRAINT "PK_e_shop_delivery_occurrence_zones" PRIMARY KEY ("occurrence_id", "zone_id")
      );
    `);

    await this.dataSource.query(`
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
        "shipping_fee" numeric(15,2) NOT NULL DEFAULT 0,
        "customer_name" varchar(255),
        "customer_phone" varchar(64),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_orders" PRIMARY KEY ("id")
      );
    `);

    await this.dataSource.query(`
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

    await this.dataSource.query(`
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

    await this.dataSource.query(`
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

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "e_shop_delivery_order_line_picks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "delivery_order_id" uuid NOT NULL,
        "transaction_line_id" uuid NOT NULL,
        "is_picked" boolean NOT NULL DEFAULT false,
        "picked_at" timestamptz,
        "picked_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e_shop_delivery_order_line_picks" PRIMARY KEY ("id")
      );
    `);
    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_e_shop_delivery_order_line_picks"
      ON "e_shop_delivery_order_line_picks" ("company_id", "delivery_order_id", "transaction_line_id");
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_delivery_order_line_picks_order"
      ON "e_shop_delivery_order_line_picks" ("company_id", "delivery_order_id");
    `);
  }

  private async ensureGeometryColumns() {
    await this.dataSource.query(`
      ALTER TABLE "e_shop_delivery_zones"
      ADD COLUMN IF NOT EXISTS "geom" geometry(Polygon, 4326);
    `);
    await this.dataSource.query(`
      ALTER TABLE "e_shop_delivery_orders"
      ADD COLUMN IF NOT EXISTS "delivery_point" geometry(Point, 4326);
    `);
  }

  private async ensureSpatialIndexes() {
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_delivery_zones_geom_gist"
      ON "e_shop_delivery_zones" USING GIST ("geom");
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_delivery_orders_delivery_point_gist"
      ON "e_shop_delivery_orders" USING GIST ("delivery_point");
    `);
  }
}
