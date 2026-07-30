import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Company } from '@modules/companies/domain/company.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { BankMovement } from './domain/bank-movement.entity';
import { BankMovementsService } from './application/bank-movements.service';
import { BankMovementsController } from './presentation/bank-movements.controller';
import { TypeOrmBankMovementRepository } from './infrastructure/repositories/typeorm-bank-movement.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Transaction, Company, BankMovement]),
  ],
  controllers: [BankMovementsController],
  providers: [
    BankMovementsService,
    {
      provide: 'BankMovementRepositoryPort',
      useClass: TypeOrmBankMovementRepository,
    },
  ],
  exports: [BankMovementsService],
})
export class BankMovementsModule {}
