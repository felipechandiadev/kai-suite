import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { DeliveryCoverageService } from '../application/delivery-coverage.service';
import { DeliveryZoneService } from '../application/delivery-zone.service';
import { DeliveryOccurrenceService } from '../application/delivery-occurrence.service';
import { DeliveryDispatchService } from '../application/delivery-dispatch.service';
import { DeliveryOrderService } from '../application/delivery-order.service';
import { OptimizeDeliveryDispatchRouteService } from '@modules/routing/application/optimize-delivery-dispatch-route.service';
import type { GeoJsonPolygon } from '../domain/delivery.types';
import type { DeliveryOrderStatus } from '../domain/delivery.types';

@Controller('e-shop/admin/delivery')
export class DeliveryAdminController {
  constructor(
    private readonly coverage: DeliveryCoverageService,
    private readonly zones: DeliveryZoneService,
    private readonly occurrences: DeliveryOccurrenceService,
    private readonly dispatches: DeliveryDispatchService,
    private readonly deliveryOrders: DeliveryOrderService,
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
      occurrenceDate: string;
      departureTime: string;
      orderCutoffTime: string;
      maxOrders?: number | null;
      driverUserId?: string | null;
      zoneIds?: string[];
    },
  ) {
    return this.occurrences.create(companyId, body);
  }

  @Get('operations')
  operationsBoard(@CurrentCompany() companyId: string) {
    return this.dispatches.getOperationsBoard(companyId);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { status: DeliveryOrderStatus },
  ) {
    return this.deliveryOrders.updateStatus(companyId, id, body.status);
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
