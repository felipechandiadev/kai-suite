import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EShopDeliveryDispatch } from '@modules/delivery/domain/e-shop-delivery-dispatch.entity';
import { EShopDeliveryOrder } from '@modules/delivery/domain/e-shop-delivery-order.entity';
import { EShopDeliverySettings } from '@modules/delivery/domain/e-shop-delivery-settings.entity';
import { DeliveryDispatchService } from '@modules/delivery/application/delivery-dispatch.service';
import { OsrmHttpClient } from './osrm-http.client';
import { buildNearestNeighborRoutePlan } from './route-plan.util';

export type OptimizeDeliveryRouteResult = {
  dispatch: EShopDeliveryDispatch;
  routingEngine: 'osrm' | 'fallback';
  stopCount: number;
  warning: string | null;
};

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

  async optimize(companyId: string, dispatchId: string): Promise<OptimizeDeliveryRouteResult> {
    const dispatch = await this.dispatchRepo.findOne({ where: { companyId, id: dispatchId } });
    if (!dispatch) throw new BadRequestException('Despacho no encontrado');

    const settings = await this.settingsRepo.findOne({ where: { companyId } });
    if (settings?.depotLat == null || settings?.depotLng == null) {
      throw new BadRequestException('Configura la bodega de despacho antes de optimizar rutas');
    }

    const readyOrders = await this.deliveryOrderRepo.find({
      where: {
        companyId,
        deliveryOccurrenceId: dispatch.occurrenceId,
        deliveryStatus: 'READY_FOR_DISPATCH' as any,
      },
      order: { createdAt: 'ASC' },
    });

    if (readyOrders.length > 0) {
      await this.dispatchService.assignOrders(
        companyId,
        dispatchId,
        readyOrders.map((o) => o.id),
      );
    }

    const withCoords = readyOrders.filter((o) => o.latitude != null && o.longitude != null);
    if (withCoords.length === 0) {
      throw new BadRequestException(
        readyOrders.length === 0
          ? 'No hay pedidos listos para reparto en este turno'
          : 'No hay pedidos con coordenadas listos para ruta',
      );
    }

    const skippedWithoutCoords = readyOrders.length - withCoords.length;
    const depot = { lat: settings.depotLat, lng: settings.depotLng };
    const coords = [
      { lng: settings.depotLng, lat: settings.depotLat },
      ...withCoords.map((o) => ({ lng: o.longitude!, lat: o.latitude! })),
    ];

    const trip = await this.osrm.trip(coords, settings.osrmUrl);
    if (trip) {
      const ordered = trip.orderedWaypointIndexes
        .map((idx, originalIdx) => ({ idx, originalIdx }))
        .filter((x) => x.idx > 0)
        .sort((a, b) => a.idx - b.idx);

      const stops = ordered.map((entry, sequenceIdx) => {
        const order = withCoords[entry.originalIdx - 1]!;
        return {
          deliveryOrderId: order.id,
          transactionId: order.transactionId,
          latitude: order.latitude!,
          longitude: order.longitude!,
          sequence: sequenceIdx + 1,
        };
      });

      const saved = await this.dispatchService.saveOptimizedStops(companyId, dispatchId, stops, {
        totalDistanceM: trip.distanceM,
        totalDurationS: trip.durationS,
        routeGeometry: trip.geometry,
      });

      return {
        dispatch: saved,
        routingEngine: 'osrm',
        stopCount: stops.length,
        warning:
          skippedWithoutCoords > 0
            ? `${skippedWithoutCoords} pedido(s) sin coordenadas no se incluyeron en la ruta.`
            : null,
      };
    }

    const fallback = buildNearestNeighborRoutePlan(
      depot,
      withCoords.map((o) => ({
        deliveryOrderId: o.id,
        transactionId: o.transactionId,
        lat: o.latitude!,
        lng: o.longitude!,
      })),
    );

    const saved = await this.dispatchService.saveOptimizedStops(
      companyId,
      dispatchId,
      fallback.stops.map((s) => ({
        deliveryOrderId: s.deliveryOrderId,
        transactionId: s.transactionId,
        latitude: s.lat,
        longitude: s.lng,
        sequence: s.sequence,
      })),
      {
        totalDistanceM: fallback.totalDistanceM,
        totalDurationS: fallback.totalDurationS,
        routeGeometry: fallback.routeGeometry,
      },
    );

    const osrmHint = settings.osrmUrl?.trim() || process.env.OSRM_URL || 'http://localhost:5001';
    let warning = `OSRM no disponible (${osrmHint}). Ruta estimada por distancia en línea recta.`;
    if (skippedWithoutCoords > 0) {
      warning += ` ${skippedWithoutCoords} pedido(s) sin coordenadas quedaron fuera.`;
    }

    return {
      dispatch: saved,
      routingEngine: 'fallback',
      stopCount: fallback.stops.length,
      warning,
    };
  }
}
