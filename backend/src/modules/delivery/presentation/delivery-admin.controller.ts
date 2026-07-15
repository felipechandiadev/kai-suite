import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { DeliveryCoverageService } from '../application/delivery-coverage.service';
import { DeliveryZoneService } from '../application/delivery-zone.service';
import { DeliveryOccurrenceService } from '../application/delivery-occurrence.service';
import { DeliveryDispatchService } from '../application/delivery-dispatch.service';
import { DeliveryOrderService } from '../application/delivery-order.service';
import { DeliveryOperationsBoardService } from '../application/delivery-operations-board.service';
import { DeliveryOrderLinePickingService } from '../application/delivery-order-line-picking.service';
import { ListDeliveryCouriersService } from '../application/list-delivery-couriers.service';
import { OptimizeDeliveryDispatchRouteService } from '@modules/routing/application/optimize-delivery-dispatch-route.service';
import type { GeoJsonPolygon } from '../domain/delivery.types';
import type { DeliveryOrderStatus } from '../domain/delivery.types';

@Controller(['e-shop/admin/delivery', 'delivery/admin'])
export class DeliveryAdminController {
  constructor(
    private readonly coverage: DeliveryCoverageService,
    private readonly zones: DeliveryZoneService,
    private readonly occurrences: DeliveryOccurrenceService,
    private readonly dispatches: DeliveryDispatchService,
    private readonly deliveryOrders: DeliveryOrderService,
    private readonly operationsBoardService: DeliveryOperationsBoardService,
    private readonly picking: DeliveryOrderLinePickingService,
    private readonly couriers: ListDeliveryCouriersService,
    private readonly optimizeRouteService: OptimizeDeliveryDispatchRouteService,
  ) {}

  @Get('settings')
  getSettings(@CurrentCompany() companyId: string) {
    return this.coverage.getSettings(companyId);
  }

  @Patch('settings')
  updateSettings(
    @CurrentCompany() companyId: string,
    @Body()
    body: {
      depotLat?: number | null;
      depotLng?: number | null;
      depotAddress?: string | null;
      localDeliveryEnabled?: boolean;
      osrmUrl?: string | null;
    },
  ) {
    return this.coverage.updateSettings(companyId, body);
  }

  @Get('communes')
  listCommunes(@CurrentCompany() companyId: string) {
    return this.coverage.listCommunes(companyId);
  }

  @Patch('communes/:id')
  setCommuneEnabled(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { isEnabled: boolean },
  ) {
    return this.coverage.setCommuneEnabled(companyId, id, body.isEnabled);
  }

  @Get('zones')
  listZones(@CurrentCompany() companyId: string) {
    return this.zones.listAdmin(companyId);
  }

  @Post('zones')
  saveZone(
    @CurrentCompany() companyId: string,
    @Body()
    body: {
      id?: string;
      name: string;
      shippingFee: number;
      isActive: boolean;
      sortOrder?: number;
      communeCode?: string | null;
      geometry?: GeoJsonPolygon | null;
    },
  ) {
    return this.zones.save(companyId, body);
  }

  @Get('drivers')
  listDrivers(@CurrentCompany() companyId: string) {
    return this.couriers.list(companyId);
  }

  @Get('calendar/occurrences')
  listOccurrences(
    @CurrentCompany() companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.occurrences.listAdmin(companyId, from, to);
  }

  @Post('calendar/occurrences')
  createOccurrence(
    @CurrentCompany() companyId: string,
    @Body()
    body: {
      name: string;
      kind?: 'LOCAL_DELIVERY' | 'PICKUP';
      occurrenceDate: string;
      departureTime: string;
      endTime?: string | null;
      orderCutoffTime: string;
      maxOrders?: number | null;
      driverUserId?: string | null;
      zoneIds?: string[];
    },
  ) {
    return this.occurrences.create(companyId, body);
  }

  @Patch('calendar/occurrences/:id')
  updateOccurrence(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      kind?: 'LOCAL_DELIVERY' | 'PICKUP';
      occurrenceDate?: string;
      departureTime?: string;
      endTime?: string | null;
      orderCutoffTime?: string;
      maxOrders?: number | null;
      driverUserId?: string | null;
      zoneIds?: string[];
      isCancelled?: boolean;
    },
  ) {
    return this.occurrences.update(companyId, id, body);
  }

  @Post('calendar/occurrences/:id/cancel')
  cancelOccurrence(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.occurrences.cancel(companyId, id);
  }

  @Patch('calendar/occurrences/:id/driver')
  assignOccurrenceDriver(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { driverUserId: string | null },
  ) {
    return this.dispatches.assignDriverToOccurrence(
      companyId,
      id,
      body.driverUserId ?? null,
    );
  }

  @Post('calendar/occurrences/:id/optimize-route')
  optimizeOccurrenceRoute(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.dispatches.optimizeOccurrenceRoute(
      companyId,
      id,
      (cid, dispatchId) => this.optimizeRouteService.optimize(cid, dispatchId),
    );
  }

  @Post('calendar/occurrences/:id/start-route')
  startOccurrenceRoute(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.dispatches.startOccurrenceRoute(companyId, id);
  }

  @Get('operations')
  getOperationsBoard(
    @CurrentCompany() companyId: string,
    @Query('date') date?: string,
    @Query('occurrenceId') occurrenceId?: string,
    @Query('search') search?: string,
  ) {
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Santiago',
    });
    return this.operationsBoardService.getBoard(companyId, {
      date: date ?? today,
      occurrenceId: occurrenceId ?? null,
      search: search ?? null,
    });
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { status: DeliveryOrderStatus },
  ) {
    return this.deliveryOrders.updateStatus(companyId, id, body.status);
  }

  @Patch('orders/:orderId/lines/:lineId/picked')
  toggleLinePicked(
    @CurrentCompany() companyId: string,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
    @Body() body: { isPicked: boolean },
  ) {
    return this.picking.toggleLinePicked(
      companyId,
      orderId,
      lineId,
      Boolean(body.isPicked),
    );
  }

  @Post('orders/:orderId/pick-all-lines')
  pickAllLines(
    @CurrentCompany() companyId: string,
    @Param('orderId') orderId: string,
    @Body() body?: { advanceTo?: DeliveryOrderStatus | null },
  ) {
    return this.picking.pickAll(companyId, orderId, {
      advanceTo: body?.advanceTo ?? null,
    });
  }

  @Post('dispatches')
  createDispatch(
    @CurrentCompany() companyId: string,
    @Body() body: { occurrenceId: string; driverUserId?: string | null },
  ) {
    return this.dispatches.create(companyId, body.occurrenceId, body.driverUserId);
  }

  @Post('dispatches/:id/assign')
  assignOrders(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { deliveryOrderIds: string[] },
  ) {
    return this.dispatches.assignOrders(companyId, id, body.deliveryOrderIds);
  }

  @Post('dispatches/:id/optimize-route')
  optimizeRoute(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.optimizeRouteService.optimize(companyId, id);
  }

  @Post('dispatches/:id/start')
  startDispatch(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.dispatches.start(companyId, id);
  }

  @Post('dispatches/:id/complete')
  completeDispatch(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.dispatches.complete(companyId, id);
  }

  @Get('dispatches/:id/stops')
  listStops(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.dispatches.listStops(companyId, id);
  }
}
