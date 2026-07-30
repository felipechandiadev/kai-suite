import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { StockRealtimePublisher } from './stock-realtime.publisher';
import { StockRealtimeGateway } from './stock-realtime.gateway';
import { WsStockTenantService } from './ws-stock-tenant.service';
import { StockThresholdSweepService } from './stock-threshold-sweep.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, Storage]),
    forwardRef(() => NotificationsModule),
  ],
  providers: [
    WsStockTenantService,
    StockRealtimePublisher,
    StockRealtimeGateway,
    StockThresholdSweepService,
  ],
  exports: [StockRealtimePublisher, WsStockTenantService],
})
export class StockRealtimeModule {}
