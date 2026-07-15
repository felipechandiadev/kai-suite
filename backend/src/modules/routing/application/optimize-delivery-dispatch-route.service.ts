import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EShopDeliveryDispatch } from '@modules/delivery/domain/e-shop-delivery-dispatch.entity';
import { EShopDeliveryOrder } from '@modules/delivery/domain/e-shop-delivery-order.entity';
import { EShopDeliverySettings } from '@modules/delivery/domain/e-shop-delivery-settings.entity';
import { DeliveryDispatchService } from '@modules/delivery/application/delivery-dispatch.service';
import { OsrmHttpClient } from './osrm-http.client';

@Injectable()
export class OptimizeDeliveryDispatchRouteService {
  constructor(
    @InjectRepository(EShopDeliveryDispatch)
    private readonly dispatchRepo: Repository<EShopDeliveryDispatch>,
    @InjectRepository(EShopDeliveryOrder)
    private readonly deliveryOrderRepo: Repository<EShopDeliveryOrder>,
    @InjectRepository(EShopDeliverySettings)
    private readonly settingsRepo: Repository<EShopDeliverySettings>,
    private readonly dispatchService: DeliveryDispatchService,
    private readonly osrm: OsrmHttpClient,
  ) {}

  async optimize(companyId: string, dispatchId: string) {
    const dispatch = await this.dispatchRepo.findOne({ where: { companyId, id: dispatchId } });
    if (!dispatch) throw new BadRequestException('Despacho no encontrado');

    const settings = await this.settingsRepo.findOne({ where: { companyId } });
    if (settings?.depotLat == null || settings?.depotLng == null) {
      throw new BadRequestException('Configura la bodega de despacho antes de optimizar rutas');
    }

    const orders = await this.deliveryOrderRepo.find({
      where: { companyId, deliveryDispatchId: dispatchId, deliveryStatus: 'READY_FOR_DISPATCH' as any },
      order: { createdAt: 'ASC' },
    });

    const withCoords = orders.filter((o) => o.latitude != null && o.longitude != null);
    if (withCoords.length === 0) {
      throw new BadRequestException('No hay pedidos con coordenadas listos para ruta');
    }

    const coords = [
      { lng: settings.depotLng!, lat: settings.depotLat! },
      ...withCoords.map((o) => ({ lng: o.longitude!, lat: o.latitude! })),
    ];

    const trip = await this.osrm.trip(coords, settings.osrmUrl);
    if (!trip) {
      const fallbackStops = withCoords.map((o, idx) => ({
        deliveryOrderId: o.id,
        transactionId: o.transactionId,
        latitude: o.latitude!,
        longitude: o.longitude!,
        sequence: idx + 1,
      }));
      return this.dispatchService.saveOptimizedStops(companyId, dispatchId, fallbackStops, {
        totalDistanceM: 0,
        totalDurationS: 0,
        routeGeometry: { type: 'LineString', coordinates: [] },
      });
    }

    const ordered = trip.orderedWaypointIndexes
      .map((idx, originalIdx) => ({ idx, originalIdx }))
      .filter((x) => x.idx > 0)
      .sort((a, b) => a.idx - b.idx);

    const stops = ordered.map((entry, sequenceIdx) => {
      const order = withCoords[entry.originalIdx - 1];
      return {
        deliveryOrderId: order.id,
        transactionId: order.transactionId,
        latitude: order.latitude!,
        longitude: order.longitude!,
        sequence: sequenceIdx + 1,
      };
    });

    return this.dispatchService.saveOptimizedStops(companyId, dispatchId, stops, {
      totalDistanceM: trip.distanceM,
      totalDurationS: trip.durationS,
      routeGeometry: trip.geometry,
    });
  }
}
