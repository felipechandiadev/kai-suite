import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashHub } from './domain/cash-hub.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { CashHubsService } from './application/cash-hubs.service';
import { CashHubsController } from './presentation/cash-hubs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CashHub, Branch, PointOfSale, Transaction])],
  controllers: [CashHubsController],
  providers: [CashHubsService],
  exports: [CashHubsService],
})
export class CashHubsModule {}
