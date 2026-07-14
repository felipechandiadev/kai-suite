import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EShopDeliveryCoverageCommune } from './domain/e-shop-delivery-coverage-commune.entity';
import { EShopDeliveryZone } from './domain/e-shop-delivery-zone.entity';
import { EShopDeliveryOccurrence } from './domain/e-shop-delivery-occurrence.entity';
import { EShopDeliveryOccurrenceZone } from './domain/e-shop-delivery-occurrence-zone.entity';
import { EShopDeliveryOrder } from './domain/e-shop-delivery-order.entity';
import { EShopDeliveryDispatch } from './domain/e-shop-delivery-dispatch.entity';
import { EShopDeliveryStop } from './domain/e-shop-delivery-stop.entity';
import { EShopDeliverySettings } from './domain/e-shop-delivery-settings.entity';
import { DeliveryCoverageService } from './application/delivery-coverage.service';
import { DeliveryZoneGeometryService } from './application/delivery-zone-geometry.service';
import { ResolveDeliveryZoneService } from './application/resolve-delivery-zone.service';
import { GeocodeAddressService } from './application/geocode-address.service';
import { DeliveryQuoteService } from './application/delivery-quote.service';
import { DeliveryOccurrenceService } from './application/delivery-occurrence.service';
import { DeliveryOrderService } from './application/delivery-order.service';
import { DeliveryZoneService } from './application/delivery-zone.service';
import { DeliveryDispatchService } from './application/delivery-dispatch.service';
import { OptimizeDeliveryDispatchRouteService } from '@modules/routing/application/optimize-delivery-dispatch-route.service';
import { DeliveryPublicController } from './presentation/delivery-public.controller';
import { DeliveryAdminController } from './presentation/delivery-admin.controller';
import { CourierController } from './presentation/courier.controller';
import { DeliverySchemaBootstrap } from './infrastructure/delivery-schema.bootstrap';
import { CompaniesModule } from '@modules/companies/companies.module';
import { User } from '@modules/users/domain/user.entity';
import { RoutingModule } from '@modules/routing/routing.module';

@Module({
  imports: [
    CompaniesModule,
    RoutingModule,
    TypeOrmModule.forFeature([
      EShopDeliveryCoverageCommune,
      EShopDeliveryZone,
      EShopDeliveryOccurrence,
      EShopDeliveryOccurrenceZone,
      EShopDeliveryOrder,
      EShopDeliveryDispatch,
      EShopDeliveryStop,
      EShopDeliverySettings,
      User,
    ]),
  ],
  controllers: [DeliveryPublicController, DeliveryAdminController, CourierController],
  providers: [
    DeliveryCoverageService,
    DeliveryZoneGeometryService,
    ResolveDeliveryZoneService,
    GeocodeAddressService,
    DeliveryQuoteService,
    DeliveryOccurrenceService,
    DeliveryOrderService,
    DeliveryZoneService,
    DeliveryDispatchService,
    OptimizeDeliveryDispatchRouteService,
    DeliverySchemaBootstrap,
  ],
  exports: [
    DeliveryCoverageService,
    DeliveryZoneService,
    ResolveDeliveryZoneService,
    DeliveryQuoteService,
    DeliveryOccurrenceService,
    DeliveryOrderService,
    DeliveryDispatchService,
  ],
})
export class EShopDeliveryModule {}
