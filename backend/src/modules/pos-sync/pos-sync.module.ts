import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosSyncCommand } from './domain/pos-sync-command.entity';
import { PosSyncService } from './application/pos-sync.service';
import { PosSyncController } from './presentation/pos-sync.controller';
import { CashSessionsModule } from '@modules/cash-sessions/cash-sessions.module';
import { FiscalModule } from '@modules/fiscal/fiscal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PosSyncCommand]),
    forwardRef(() => CashSessionsModule),
    forwardRef(() => FiscalModule),
  ],
  controllers: [PosSyncController],
  providers: [PosSyncService],
  exports: [PosSyncService],
})
export class PosSyncModule {}
