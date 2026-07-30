import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Mensaje accionable cuando falta PostGIS o columnas espaciales. */
export const POSTGIS_REQUIRED_MESSAGE =
  'PostGIS no está disponible en esta base de datos. ' +
  'Activa la extensión (CREATE EXTENSION IF NOT EXISTS postgis) con un rol superuser, ' +
  'usa la imagen Docker postgis/postgis (kai-core/docker-compose.yml) o recrea el volumen, ' +
  'y corre las migraciones. Ver docs/project/POSTGIS-DELIVERY.md';

export async function isPostgisInstalled(dataSource: DataSource): Promise<boolean> {
  try {
    const rows = await dataSource.query(
      `SELECT 1 AS ok FROM pg_extension WHERE extname = 'postgis' LIMIT 1`,
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function hasDeliveryGeomColumns(dataSource: DataSource): Promise<boolean> {
  const zoneCol = await dataSource.query(
    `
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'delivery_zones'
      AND column_name = 'geom'
    LIMIT 1
    `,
  );
  const orderCol = await dataSource.query(
    `
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'delivery_orders'
      AND column_name = 'delivery_point'
    LIMIT 1
    `,
  );
  return (
    Array.isArray(zoneCol) &&
    zoneCol.length > 0 &&
    Array.isArray(orderCol) &&
    orderCol.length > 0
  );
}

export function throwIfPostgisUnavailable(condition: boolean, detail?: string): void {
  if (!condition) {
    throw new ServiceUnavailableException(
      detail ? `${POSTGIS_REQUIRED_MESSAGE} (${detail})` : POSTGIS_REQUIRED_MESSAGE,
    );
  }
}

export function isMissingPostgisError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /postgis/i.test(msg) ||
    /function\s+st_/i.test(msg) ||
    /type\s+"?geometry"?\s+does not exist/i.test(msg) ||
    /column\s+"?geom"?\s+does not exist/i.test(msg) ||
    /column\s+"?delivery_point"?\s+does not exist/i.test(msg)
  );
}
