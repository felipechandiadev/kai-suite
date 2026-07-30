import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosSyncCommand } from './domain/pos-sync-command.entity';
import { PosSyncService } from './application/pos-sync.service';
import { PosSyncController } from './presentation/pos-sync.controller';
import { CashSessionsModule } from '@modules/cash-sessions/cash-sessions.module';
import { FiscalModule } from '@modules/fiscal/fiscal.module';
import { SyncSaleHandler } from './application/handlers/sync-sale.handler';
import { SyncCashMovementHandler } from './application/handlers/sync-cash-movement.handler';
import { SyncHubHandler } from './application/handlers/sync-hub.handler';
import { SyncCloseSessionHandler } from './application/handlers/sync-close-session.handler';
import { User } from '@modules/users/domain/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PosSyncCommand, User]),
    forwardRef(() => CashSessionsModule),
    forwardRef(() => FiscalModule),
  ],
  controllers: [PosSyncController],
  providers: [
    PosSyncService,
    SyncSaleHandler,
    SyncCashMovementHandler,
    SyncHubHandler,
    SyncCloseSessionHandler,
  ],
  exports: [PosSyncService],
})
export class PosSyncModule {}
