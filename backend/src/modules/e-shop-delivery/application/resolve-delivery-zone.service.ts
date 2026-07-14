import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DeliveryCoverageService } from './delivery-coverage.service';
import {
  isMissingPostgisError,
  isPostgisInstalled,
  POSTGIS_REQUIRED_MESSAGE,
} from '../infrastructure/postgis.support';

export type ResolvedZone = {
  zoneId: string;
  zoneName: string;
  shippingFee: number;
  communeCode: string | null;
} | null;

@Injectable()
export class ResolveDeliveryZoneService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly coverage: DeliveryCoverageService,
  ) {}

  async resolveByPoint(
    companyId: string,
    latitude: number,
    longitude: number,
    communeCode?: string | null,
  ): Promise<ResolvedZone> {
    const enabled = await this.coverage.getEnabledCommuneCodes(companyId);
    if (communeCode && enabled.size > 0 && !enabled.has(communeCode)) {
      return null;
    }

    if (!(await isPostgisInstalled(this.dataSource))) {
      throw new ServiceUnavailableException(POSTGIS_REQUIRED_MESSAGE);
    }

    try {
      const rows = await this.dataSource.query(
        `
        SELECT z.id, z.name, z.shipping_fee, z.commune_code
        FROM e_shop_delivery_zones z
        WHERE z.company_id = $1
          AND z.is_active = true
          AND z.geom IS NOT NULL
          AND ST_Contains(z.geom, ST_SetSRID(ST_MakePoint($3, $2), 4326))
        ORDER BY z.sort_order ASC, z.created_at ASC
        LIMIT 1
        `,
        [companyId, latitude, longitude],
      );

      if (!rows[0]) return null;
      return {
        zoneId: rows[0].id,
        zoneName: rows[0].name,
        shippingFee: Number(rows[0].shipping_fee) || 0,
        communeCode: rows[0].commune_code ?? null,
      };
    } catch (err) {
      if (isMissingPostgisError(err)) {
        throw new ServiceUnavailableException(POSTGIS_REQUIRED_MESSAGE);
      }
      throw err;
    }
  }

  async resolveByZoneId(companyId: string, zoneId: string): Promise<ResolvedZone> {
    const rows = await this.dataSource.query(
      `
      SELECT id, name, shipping_fee, commune_code
      FROM e_shop_delivery_zones
      WHERE company_id = $1
        AND id = $2
        AND is_active = true
      LIMIT 1
      `,
      [companyId, zoneId],
    );
    if (!rows[0]) return null;
    return {
      zoneId: rows[0].id,
      zoneName: rows[0].name,
      shippingFee: Number(rows[0].shipping_fee) || 0,
      communeCode: rows[0].commune_code ?? null,
    };
  }

  async resolveByCommuneFallback(
    companyId: string,
    communeCode: string,
  ): Promise<ResolvedZone> {
    const enabled = await this.coverage.getEnabledCommuneCodes(companyId);
    if (enabled.size > 0 && !enabled.has(communeCode)) return null;

    const rows = await this.dataSource.query(
      `
      SELECT id, name, shipping_fee, commune_code
      FROM e_shop_delivery_zones
      WHERE company_id = $1
        AND is_active = true
        AND commune_code = $2
      ORDER BY sort_order ASC, created_at ASC
      LIMIT 1
      `,
      [companyId, communeCode],
    );
    if (!rows[0]) return null;
    return {
      zoneId: rows[0].id,
      zoneName: rows[0].name,
      shippingFee: Number(rows[0].shipping_fee) || 0,
      communeCode: rows[0].commune_code ?? null,
    };
  }
}
