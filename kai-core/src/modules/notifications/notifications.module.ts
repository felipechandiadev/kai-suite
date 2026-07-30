import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { StockRealtimeModule } from '@modules/stock-realtime/stock-realtime.module';
import { Notification } from './domain/notification.entity';
import { NotificationDelivery } from './domain/notification-delivery.entity';
import { NotificationAudience } from './domain/notification-audience.entity';
import { NotificationPreference } from './domain/notification-preference.entity';
import { NotificationRetentionPolicy } from './domain/notification-retention-policy.entity';
import { WebPushSubscription } from './domain/web-push-subscription.entity';
import { NotificationPublisherService } from './application/notification-publisher.service';
import { NotificationInboxService } from './application/notification-inbox.service';
import { AudienceResolverService } from './application/audience-resolver.service';
import { StockNotificationEvaluator } from './application/stock-notification.evaluator';
import { NotificationRetentionService } from './application/notification-retention.service';
import { StockAlertNotificationService } from './application/stock-alert-notification.service';
import { NotificationsRealtimePublisher } from './application/notifications-realtime.publisher';
import { WebPushSubscriptionService } from './application/web-push-subscription.service';
import { WebPushSenderService } from './application/web-push-sender.service';
import { NotificationsController } from './presentation/notifications.controller';
import { NotificationsGateway } from './presentation/notifications.gateway';
import { WsNotificationsTenantService } from './presentation/ws-notifications-tenant.service';
import { NotificationsDomainSchemaBootstrap } from './infrastructure/notifications-domain-schema.bootstrap';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationDelivery,
      NotificationAudience,
      NotificationPreference,
      NotificationRetentionPolicy,
      WebPushSubscription,
      User,
      Company,
    ]),
    forwardRef(() => StockRealtimeModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationPublisherService,
    NotificationInboxService,
    AudienceResolverService,
    StockNotificationEvaluator,
    NotificationRetentionService,
    StockAlertNotificationService,
    NotificationsRealtimePublisher,
    WebPushSubscriptionService,
    WebPushSenderService,
    NotificationsGateway,
    WsNotificationsTenantService,
    NotificationsDomainSchemaBootstrap,
  ],
  exports: [
    NotificationPublisherService,
    NotificationInboxService,
    StockNotificationEvaluator,
    StockAlertNotificationService,
    NotificationsRealtimePublisher,
    WebPushSenderService,
  ],
})
export class NotificationsModule {}
