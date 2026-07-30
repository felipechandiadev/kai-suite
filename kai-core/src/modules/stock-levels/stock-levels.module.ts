import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { StockLevelsController } from './presentation/stock-levels.controller';
import { StockLevelsServiceAdapter } from './application/stock-levels.service.adapter';
import { StockLevel } from './domain/stock-level.entity';
import { GetStockLevelsQueryHandler } from './application/handlers/queries/get-stock-levels.handler';
import { AdjustStockCommandHandler } from './application/handlers/commands/adjust-stock.handler';
import { TypeOrmStockLevelsRepository } from './infrastructure/repositories/typeorm-stock-levels.repository';
import { StockCommitmentService } from './application/stock-commitment.service';
import { StockRealtimeModule } from '@modules/stock-realtime/stock-realtime.module';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([StockLevel]), StockRealtimeModule],
  controllers: [StockLevelsController],
  providers: [
    StockCommitmentService,
    StockLevelsServiceAdapter,
    GetStockLevelsQueryHandler,
    AdjustStockCommandHandler,
    {
      provide: 'StockLevelsRepositoryPort',
      useClass: TypeOrmStockLevelsRepository,
    },
  ],
  exports: [StockLevelsServiceAdapter, StockCommitmentService],
})
export class StockLevelsModule {}