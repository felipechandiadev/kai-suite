import { randomUUID } from 'node:crypto';
import { DataSource, In } from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { EShopDeliveryDispatch } from '@modules/delivery/domain/e-shop-delivery-dispatch.entity';
import { EShopDeliveryOccurrence } from '@modules/delivery/domain/e-shop-delivery-occurrence.entity';
import { EShopDeliveryOrder } from '@modules/delivery/domain/e-shop-delivery-order.entity';
import { EShopDeliveryStop } from '@modules/delivery/domain/e-shop-delivery-stop.entity';
import { EShopDeliveryZone } from '@modules/delivery/domain/e-shop-delivery-zone.entity';
import {
  SEED_DELIVERY_COMMUNE_CODE,
  SEED_DELIVERY_REPARTO,
  SEED_DELIVERY_SHIPPING_FEE,
  SEED_DELIVERY_ZONE_NAME,
  SEED_DEV_COMPANY,
} from './config';

const SEED_ORDER_MARKER = 'seed-demo-reparto';

const SAMPLE_ORDERS = [
  {
    customerName: 'María González',
    customerPhone: '+56912345001',
    addressLine1: "Av. O'Higgins 450",
    latitude: -36.1285,
    longitude: -71.8195,
  },
  {
    customerName: 'Pedro Soto',
    customerPhone: '+56912345002',
    addressLine1: 'Los Rosales 123',
    latitude: -36.1342,
    longitude: -71.812,
  },
  {
    customerName: 'Ana Riquelme',
    customerPhone: '+56912345003',
    addressLine1: 'Baquedano 88',
    latitude: -36.139,
    longitude: -71.826,
  },
  {
    customerName: 'Luis Morales',
    customerPhone: '+56912345004',
    addressLine1: 'Miraflores 210',
    latitude: -36.125,
    longitude: -71.83,
  },
] as const;

export type SeedDeliveryOrdersForDateParams = {
  dataSource: DataSource;
  /** YYYY-MM-DD (calendario reparto, zona Chile). */
  targetDate: string;
  /** userName del repartidor; default delivery1. */
  courierUserName?: string;
};

/** Mañana en America/Santiago como YYYY-MM-DD. */
export function tomorrowIsoSantiago(from = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(from);
  const y = Number(parts.find((p) => p.type === 'year')?.value ?? '2026');
  const m = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const d = Number(parts.find((p) => p.type === 'day')?.value ?? '1');
  const local = new Date(Date.UTC(y, m - 1, d + 1));
  return local.toISOString().slice(0, 10);
}

export async function seedDeliveryOrdersForDate(
  params: SeedDeliveryOrdersForDateParams,
): Promise<void> {
  const { dataSource, targetDate } = params;
  const courierUserName = params.courierUserName?.trim() || 'delivery1';

  const companyRepo = dataSource.getRepository(Company);
  const userRepo = dataSource.getRepository(User);
  const zoneRepo = dataSource.getRepository(EShopDeliveryZone);
  const occurrenceRepo = dataSource.getRepository(EShopDeliveryOccurrence);
  const orderRepo = dataSource.getRepository(EShopDeliveryOrder);
  const dispatchRepo = dataSource.getRepository(EShopDeliveryDispatch);
  const stopRepo = dataSource.getRepository(EShopDeliveryStop);

  const rut = process.env.SEED_COMPANY_RUT?.trim() || SEED_DEV_COMPANY.rut;
  const company = await companyRepo.findOne({
    where: { rut, deletedAt: null as never },
  });
  if (!company) {
    throw new Error(`Empresa demo no encontrada (RUT ${rut}). Ejecuta npm run seed:demo --prefix seeds.`);
  }

  const courier = await userRepo.findOne({
    where: { userName: courierUserName, companyId: company.id, rol: UserRole.COURIER },
  });
  if (!courier) {
    throw new Error(
      `Repartidor «${courierUserName}» no encontrado. Ejecuta npm run seed:demo --prefix seeds.`,
    );
  }

  const zone = await zoneRepo.findOne({
    where: { companyId: company.id, name: SEED_DELIVERY_ZONE_NAME },
  });
  if (!zone) {
    throw new Error(`Zona «${SEED_DELIVERY_ZONE_NAME}» no encontrada. Ejecuta seed delivery calendar.`);
  }

  let occurrence = await occurrenceRepo.findOne({
    where: {
      companyId: company.id,
      occurrenceDate: targetDate,
      kind: 'LOCAL_DELIVERY',
      name: SEED_DELIVERY_REPARTO.name,
    },
  });
  if (!occurrence) {
    occurrence = await occurrenceRepo.save(
      occurrenceRepo.create({
        companyId: company.id,
        name: SEED_DELIVERY_REPARTO.name,
        kind: 'LOCAL_DELIVERY',
        occurrenceDate: targetDate,
        departureTime: SEED_DELIVERY_REPARTO.departureTime,
        endTime: null,
        orderCutoffTime: SEED_DELIVERY_REPARTO.orderCutoffTime,
        maxOrders: SEED_DELIVERY_REPARTO.maxOrders,
        driverUserId: courier.id,
        isCancelled: false,
        routeStatus: 'planned',
      }),
    );
    console.log(`✅ Franja reparto creada para ${targetDate} id=${occurrence.id}`);
  }

  const existingSeedOrders = await orderRepo.find({
    where: { companyId: company.id, deliveryOccurrenceId: occurrence.id },
  });
  const toRemove = existingSeedOrders.filter((o) =>
    (o.notes ?? '').includes(SEED_ORDER_MARKER),
  );
  if (toRemove.length > 0) {
    const orderIds = toRemove.map((o) => o.id);
    await stopRepo.delete({ companyId: company.id, deliveryOrderId: In(orderIds) });
    await orderRepo.delete({ companyId: company.id, id: In(orderIds) });
    console.log(`✅ ${toRemove.length} pedido(s) seed previos eliminados para ${targetDate}`);
  }

  let dispatch = await dispatchRepo.findOne({
    where: { companyId: company.id, occurrenceId: occurrence.id },
    order: { createdAt: 'ASC' },
  });
  if (!dispatch) {
    dispatch = await dispatchRepo.save(
      dispatchRepo.create({
        companyId: company.id,
        occurrenceId: occurrence.id,
        driverUserId: courier.id,
        label: occurrence.name,
        status: 'planned',
      }),
    );
  } else {
    dispatch.driverUserId = courier.id;
    await dispatchRepo.save(dispatch);
  }

  occurrence.driverUserId = courier.id;
  await occurrenceRepo.save(occurrence);

  const savedOrders: EShopDeliveryOrder[] = [];
  for (const sample of SAMPLE_ORDERS) {
    const transactionId = randomUUID();
    const row = await orderRepo.save(
      orderRepo.create({
        companyId: company.id,
        transactionId,
        fulfillmentType: 'LOCAL_DELIVERY',
        sourceChannel: 'ESHOP',
        deliveryZoneId: zone.id,
        deliveryOccurrenceId: occurrence.id,
        deliveryDispatchId: dispatch.id,
        deliveryStatus: 'READY_FOR_DISPATCH',
        addressLine1: sample.addressLine1,
        commune: SEED_DELIVERY_COMMUNE_CODE,
        region: 'Maule',
        latitude: sample.latitude,
        longitude: sample.longitude,
        shippingFee: SEED_DELIVERY_SHIPPING_FEE,
        customerName: sample.customerName,
        customerPhone: sample.customerPhone,
        notes: SEED_ORDER_MARKER,
      }),
    );
    await dataSource.query(
      `UPDATE delivery_orders SET delivery_point = ST_SetSRID(ST_MakePoint($2, $3), 4326) WHERE id = $1`,
      [row.id, sample.longitude, sample.latitude],
    );
    savedOrders.push(row);
  }

  await stopRepo.delete({ companyId: company.id, dispatchId: dispatch.id });

  const stops = savedOrders.map((order, index) =>
    stopRepo.create({
      companyId: company.id,
      dispatchId: dispatch!.id,
      deliveryOrderId: order.id,
      transactionId: order.transactionId,
      sequence: index + 1,
      latitude: order.latitude!,
      longitude: order.longitude!,
      stopStatus: 'pending',
    }),
  );
  await stopRepo.save(stops);

  dispatch.status = 'route_ready';
  dispatch.routeOptimizedAt = new Date();
  await dispatchRepo.save(dispatch);

  occurrence.routeStatus = 'route_ready';
  occurrence.routeOptimizedAt = new Date();
  await occurrenceRepo.save(occurrence);

  console.log(
    `✅ Reparto ${targetDate}: ${savedOrders.length} pedidos listos (READY_FOR_DISPATCH)`,
  );
  console.log(`   Empresa: ${company.nombreFantasia ?? company.razonSocial} (${company.id})`);
  console.log(`   Repartidor: ${courierUserName} (${courier.id})`);
  console.log(`   Despacho: ${dispatch.id} · franja: ${occurrence.id}`);
}
