import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { CapitalContribution } from './domain/capital-contribution.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { CapitalContributionsService } from './application/capital-contributions.service';
import { CapitalContributionsController } from './presentation/capital-contributions.controller';
import { TypeOrmCapitalContributionRepository } from './infrastructure/repositories/typeorm-capital-contribution.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Transaction, User, Branch, CashHub, CapitalContribution]),
    TransactionsModule,
  ],
  controllers: [CapitalContributionsController],
  providers: [
    CapitalContributionsService,
    {
      provide: 'CapitalContributionRepositoryPort',
      useClass: TypeOrmCapitalContributionRepository,
    },
  ],
  exports: [CapitalContributionsService],
})
export class CapitalContributionsModule {}
