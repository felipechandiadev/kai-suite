import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Asegura columnas espaciales + índices GIST para delivery.
 * Requiere PostGIS instalado en la base (imagen postgis/postgis o CREATE EXTENSION).
 * Idempotente: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 */
export class EShopDeliveryPostgisGeometry1756790000000 implements MigrationInterface {
  name = 'EShopDeliveryPostgisGeometry1756790000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const ext = await queryRunner.query(
      `SELECT 1 AS ok FROM pg_extension WHERE extname = 'postgis' LIMIT 1`,
    );

    if (!Array.isArray(ext) || ext.length === 0) {
      try {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
      } catch (err) {
        throw new Error(
          `PostGIS es requerido para e-shop-delivery (zonas/geom). ` +
            `No se pudo crear la extensión: ${String(err)}. ` +
            `Usa la imagen postgis/postgis, recrea el volumen Docker, o ejecuta ` +
            `CREATE EXTENSION IF NOT EXISTS postgis; como superuser. ` +
            `Ver docs/project/POSTGIS-DELIVERY.md`,
        );
      }
    }

    const stillMissing = await queryRunner.query(
      `SELECT 1 AS ok FROM pg_extension WHERE extname = 'postgis' LIMIT 1`,
    );
    if (!Array.isArray(stillMissing) || stillMissing.length === 0) {
      throw new Error(
        'PostGIS no está instalado. Ver docs/project/POSTGIS-DELIVERY.md',
      );
    }

    await queryRunner.query(`
      ALTER TABLE "e_shop_delivery_zones"
      ADD COLUMN IF NOT EXISTS "geom" geometry(Polygon, 4326);
    `);

    await queryRunner.query(`
      ALTER TABLE "e_shop_delivery_orders"
      ADD COLUMN IF NOT EXISTS "delivery_point" geometry(Point, 4326);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_delivery_zones_geom_gist"
      ON "e_shop_delivery_zones" USING GIST ("geom");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_e_shop_delivery_orders_delivery_point_gist"
      ON "e_shop_delivery_orders" USING GIST ("delivery_point");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_e_shop_delivery_orders_delivery_point_gist"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_e_shop_delivery_zones_geom_gist"`,
    );
    await queryRunner.query(
      `ALTER TABLE "e_shop_delivery_orders" DROP COLUMN IF EXISTS "delivery_point"`,
    );
    await queryRunner.query(
      `ALTER TABLE "e_shop_delivery_zones" DROP COLUMN IF EXISTS "geom"`,
    );
  }
}
