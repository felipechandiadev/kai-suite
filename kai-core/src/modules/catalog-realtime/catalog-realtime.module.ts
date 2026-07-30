import { Module, forwardRef } from '@nestjs/common';
import { StockRealtimeModule } from '@modules/stock-realtime/stock-realtime.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { CatalogRealtimePublisher } from './catalog-realtime.publisher';
import { CatalogRealtimeGateway } from './catalog-realtime.gateway';
import { PricingNotificationService } from './pricing-notification.service';

@Module({
  imports: [
    forwardRef(() => StockRealtimeModule),
    forwardRef(() => NotificationsModule),
  ],
  providers: [
    CatalogRealtimePublisher,
    CatalogRealtimeGateway,
    PricingNotificationService,
  ],
  exports: [CatalogRealtimePublisher, PricingNotificationService],
})
export class CatalogRealtimeModule {}
