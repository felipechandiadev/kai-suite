import { Between, DataSource, In } from 'typeorm';
import { EShopDeliveryCoverageCommune } from '@modules/e-shop-delivery/domain/e-shop-delivery-coverage-commune.entity';
import { EShopDeliveryOccurrence } from '@modules/e-shop-delivery/domain/e-shop-delivery-occurrence.entity';
import { EShopDeliveryOccurrenceZone } from '@modules/e-shop-delivery/domain/e-shop-delivery-occurrence-zone.entity';
import { EShopDeliverySettings } from '@modules/e-shop-delivery/domain/e-shop-delivery-settings.entity';
import { EShopDeliveryZone } from '@modules/e-shop-delivery/domain/e-shop-delivery-zone.entity';
import {
  MAULE_COMMUNES_SEED,
  MAULE_REGION_CODE,
  type GeoJsonPolygon,
} from '@modules/e-shop-delivery/domain/delivery.types';
import {
  isMissingPostgisError,
  isPostgisInstalled,
} from '@modules/e-shop-delivery/infrastructure/postgis.support';
import {
  SEED_DELIVERY_CALENDAR_MONTHS_2026,
  SEED_DELIVERY_COMMUNE_CODE,
  SEED_DELIVERY_DEPOT,
  SEED_DELIVERY_PICKUP,
  SEED_DELIVERY_REPARTO,
  SEED_DELIVERY_SHIPPING_FEE,
  SEED_DELIVERY_ZONE_NAME,
} from './config';

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dateYmd(year: number, month1to12: number, day: number): string {
  return `${year}-${pad2(month1to12)}-${pad2(day)}`;
}

function eachCalendarDate(year: number, months: readonly number[]): string[] {
  const out: string[] = [];
  for (const month of months) {
    const last = daysInMonth(year, month);
    for (let day = 1; day <= last; day += 1) {
      out.push(dateYmd(year, month, day));
    }
  }
  return out;
}

function depotPolygon(lat: number, lng: number, offset = 0.04): GeoJsonPolygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng - offset, lat - offset],
        [lng + offset, lat - offset],
        [lng + offset, lat + offset],
        [lng - offset, lat + offset],
        [lng - offset, lat - offset],
      ],
    ],
  };
}

async function saveZoneGeometrySafe(
  dataSource: DataSource,
  zoneId: string,
  geometry: GeoJsonPolygon,
): Promise<boolean> {
  if (!(await isPostgisInstalled(dataSource))) {
    console.warn(
      '⚠️  Seed delivery: PostGIS no disponible; zona sin geometría (franjas igual se crean)',
    );
    return false;
  }
  try {
    const json = JSON.stringify(geometry);
    const valid = await dataSource.query(
      `SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS ok`,
      [json],
    );
    if (!valid[0]?.ok) {
      console.warn('⚠️  Seed delivery: polígono inválido; se omite geom');
      return false;
    }
    await dataSource.query(
      `UPDATE e_shop_delivery_zones SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) WHERE id = $2`,
      [json, zoneId],
    );
    return true;
  } catch (err) {
    if (isMissingPostgisError(err)) {
      console.warn('⚠️  Seed delivery: PostGIS ausente al guardar geom');
      return false;
    }
    throw err;
  }
}

export type SeedDeliveryCalendarParams = {
  dataSource: DataSource;
  companyId: string;
};

/**
 * Settings + comuna Parral + zona + franjas LOCAL_DELIVERY y PICKUP
 * para todos los días de julio y agosto 2026.
 */
export async function seedDemoDeliveryCalendar(
  params: SeedDeliveryCalendarParams,
): Promise<void> {
  const { dataSource, companyId } = params;

  const settingsRepo = dataSource.getRepository(EShopDeliverySettings);
  const communeRepo = dataSource.getRepository(EShopDeliveryCoverageCommune);
  const zoneRepo = dataSource.getRepository(EShopDeliveryZone);
  const occurrenceRepo = dataSource.getRepository(EShopDeliveryOccurrence);
  const occurrenceZoneRepo = dataSource.getRepository(
    EShopDeliveryOccurrenceZone,
  );

  let settings = await settingsRepo.findOne({ where: { companyId } });
  if (!settings) {
    settings = settingsRepo.create({
      companyId,
      depotLat: SEED_DELIVERY_DEPOT.lat,
      depotLng: SEED_DELIVERY_DEPOT.lng,
      depotAddress: SEED_DELIVERY_DEPOT.address,
      regionCode: MAULE_REGION_CODE,
      localDeliveryEnabled: true,
      osrmUrl: SEED_DELIVERY_DEPOT.osrmUrl,
    });
  } else {
    settings.depotLat = SEED_DELIVERY_DEPOT.lat;
    settings.depotLng = SEED_DELIVERY_DEPOT.lng;
    settings.depotAddress = SEED_DELIVERY_DEPOT.address;
    settings.regionCode = MAULE_REGION_CODE;
    settings.localDeliveryEnabled = true;
    settings.osrmUrl = SEED_DELIVERY_DEPOT.osrmUrl;
  }
  await settingsRepo.save(settings);
  console.log(
    `✅ Delivery settings: localDeliveryEnabled=true depot=${SEED_DELIVERY_DEPOT.address}`,
  );

  const existingCommunes = await communeRepo.find({ where: { companyId } });
  const byCode = new Map(existingCommunes.map((c) => [c.code, c]));
  for (const c of MAULE_COMMUNES_SEED) {
    const row = byCode.get(c.code);
    if (!row) {
      const created = await communeRepo.save(
        communeRepo.create({
          companyId,
          code: c.code,
          name: c.name,
          province: c.province,
          regionCode: MAULE_REGION_CODE,
          isEnabled: c.code === SEED_DELIVERY_COMMUNE_CODE,
        }),
      );
      byCode.set(c.code, created);
    } else if (c.code === SEED_DELIVERY_COMMUNE_CODE && !row.isEnabled) {
      row.isEnabled = true;
      await communeRepo.save(row);
    }
  }
  console.log(
    `✅ Cobertura comunas Maule sincronizada; «${SEED_DELIVERY_COMMUNE_CODE}» habilitada`,
  );

  let zone = await zoneRepo.findOne({
    where: { companyId, name: SEED_DELIVERY_ZONE_NAME },
  });
  if (!zone) {
    zone = await zoneRepo.save(
      zoneRepo.create({
        companyId,
        name: SEED_DELIVERY_ZONE_NAME,
        shippingFee: SEED_DELIVERY_SHIPPING_FEE,
        isActive: true,
        sortOrder: 0,
        communeCode: SEED_DELIVERY_COMMUNE_CODE,
      }),
    );
    console.log(`✅ Zona de reparto creada: «${zone.name}» id=${zone.id}`);
  } else {
    zone.shippingFee = SEED_DELIVERY_SHIPPING_FEE;
    zone.isActive = true;
    zone.communeCode = SEED_DELIVERY_COMMUNE_CODE;
    zone = await zoneRepo.save(zone);
    console.log(`✅ Zona de reparto sincronizada: «${zone.name}» id=${zone.id}`);
  }

  const geomOk = await saveZoneGeometrySafe(
    dataSource,
    zone.id,
    depotPolygon(SEED_DELIVERY_DEPOT.lat, SEED_DELIVERY_DEPOT.lng),
  );
  if (geomOk) {
    console.log(`✅ Geometría zona «${zone.name}» guardada (PostGIS)`);
  }

  const dates = eachCalendarDate(2026, SEED_DELIVERY_CALENDAR_MONTHS_2026);
  const from = dates[0]!;
  const to = dates[dates.length - 1]!;

  const existingInRange = await occurrenceRepo.find({
    where: {
      companyId,
      occurrenceDate: Between(from, to),
    },
    select: ['id'],
  });
  if (existingInRange.length > 0) {
    const ids = existingInRange.map((o) => o.id);
    await occurrenceZoneRepo.delete({ occurrenceId: In(ids) });
    await occurrenceRepo.delete({ id: In(ids) });
    console.log(
      `✅ Calendario ${from}…${to}: ${existingInRange.length} franja(s) previas eliminadas`,
    );
  }

  const deliveryRows: EShopDeliveryOccurrence[] = [];
  const pickupRows: EShopDeliveryOccurrence[] = [];
  for (const occurrenceDate of dates) {
    deliveryRows.push(
      occurrenceRepo.create({
        companyId,
        name: SEED_DELIVERY_REPARTO.name,
        kind: 'LOCAL_DELIVERY',
        occurrenceDate,
        departureTime: SEED_DELIVERY_REPARTO.departureTime,
        endTime: null,
        orderCutoffTime: SEED_DELIVERY_REPARTO.orderCutoffTime,
        maxOrders: SEED_DELIVERY_REPARTO.maxOrders,
        driverUserId: null,
        isCancelled: false,
        routeStatus: 'planned',
      }),
    );
    pickupRows.push(
      occurrenceRepo.create({
        companyId,
        name: SEED_DELIVERY_PICKUP.name,
        kind: 'PICKUP',
        occurrenceDate,
        departureTime: SEED_DELIVERY_PICKUP.departureTime,
        endTime: SEED_DELIVERY_PICKUP.endTime,
        orderCutoffTime: SEED_DELIVERY_PICKUP.orderCutoffTime,
        maxOrders: SEED_DELIVERY_PICKUP.maxOrders,
        driverUserId: null,
        isCancelled: false,
        routeStatus: 'planned',
      }),
    );
  }

  const savedDeliveries = await occurrenceRepo.save(deliveryRows);
  await occurrenceRepo.save(pickupRows);

  const zoneLinks = savedDeliveries.map((occ) =>
    occurrenceZoneRepo.create({
      companyId,
      occurrenceId: occ.id,
      zoneId: zone!.id,
    }),
  );
  await occurrenceZoneRepo.save(zoneLinks);

  console.log(
    `✅ Calendario delivery ${from}…${to}: ${savedDeliveries.length} repartos + ${pickupRows.length} retiros en local`,
  );
}
