import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { DiningModule } from '@modules/dining/dining.module';
import { DiningRealtimePublisher } from './dining-realtime.publisher';
import { DiningRealtimeGateway } from './dining-realtime.gateway';
import { WsDiningTenantService } from './ws-dining-tenant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Company,
      Branch,
      DiningRoom,
      ProductionUnit,
    ]),
    forwardRef(() => DiningModule),
  ],
  providers: [
    WsDiningTenantService,
    DiningRealtimePublisher,
    DiningRealtimeGateway,
  ],
  exports: [DiningRealtimePublisher, WsDiningTenantService],
})
export class DiningRealtimeModule {}
