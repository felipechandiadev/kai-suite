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
import { DiningBoardRealtimeGateway } from './dining-board-realtime.gateway';
import { WsDiningTenantService } from './ws-dining-tenant.service';
import { DiningBoardDisplay } from '@modules/dining/domain/dining-board-display.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Company,
      Branch,
      DiningRoom,
      ProductionUnit,
      DiningBoardDisplay,
    ]),
    forwardRef(() => DiningModule),
  ],
  providers: [
    WsDiningTenantService,
    DiningRealtimePublisher,
    DiningRealtimeGateway,
    DiningBoardRealtimeGateway,
  ],
  exports: [DiningRealtimePublisher, WsDiningTenantService],
})
export class DiningRealtimeModule {}
