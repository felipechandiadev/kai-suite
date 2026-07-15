import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { GeoJsonPolygon } from '../domain/delivery.types';
import {
  isMissingPostgisError,
  isPostgisInstalled,
  POSTGIS_REQUIRED_MESSAGE,
} from '../infrastructure/postgis.support';

@Injectable()
export class DeliveryZoneGeometryService {
  constructor(private readonly dataSource: DataSource) {}

  async saveZoneGeometry(zoneId: string, geometry: GeoJsonPolygon | null) {
    await this.assertPostgis();

    try {
      if (!geometry) {
        await this.dataSource.query(
          `UPDATE delivery_zones SET geom = NULL WHERE id = $1`,
          [zoneId],
        );
        return;
      }

      const json = JSON.stringify(geometry);
      const valid = await this.dataSource.query(
        `SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS ok`,
        [json],
      );
      if (!valid[0]?.ok) {
        throw new BadRequestException('Polígono inválido');
      }

      await this.dataSource.query(
        `UPDATE delivery_zones SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) WHERE id = $2`,
        [json, zoneId],
      );
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      if (isMissingPostgisError(err)) {
        throw new ServiceUnavailableException(POSTGIS_REQUIRED_MESSAGE);
      }
      throw err;
    }
  }

  async readZoneGeometry(zoneId: string): Promise<GeoJsonPolygon | null> {
    if (!(await isPostgisInstalled(this.dataSource))) {
      return null;
    }

    try {
      const rows = await this.dataSource.query(
        `SELECT ST_AsGeoJSON(geom)::json AS geo FROM delivery_zones WHERE id = $1 AND geom IS NOT NULL`,
        [zoneId],
      );
      const geo = rows[0]?.geo;
      if (!geo || geo.type !== 'Polygon') return null;
      return geo as GeoJsonPolygon;
    } catch (err) {
      if (isMissingPostgisError(err)) {
        return null;
      }
      throw err;
    }
  }

  private async assertPostgis() {
    if (!(await isPostgisInstalled(this.dataSource))) {
      throw new ServiceUnavailableException(POSTGIS_REQUIRED_MESSAGE);
    }
  }
}
