import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ReceptionsController } from './presentation/receptions.controller';
import { ReceptionsService } from './application/receptions.service';
import { Reception } from './domain/reception.entity';
import { ReceptionLine } from './domain/reception-line.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { User } from '@modules/users/domain/user.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { ProductVariantsModule } from '@modules/product-variants/product-variants.module';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { CashSessionsModule } from '@modules/cash-sessions/cash-sessions.module';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reception,
      ReceptionLine,
      Storage,
      Branch,
      Company,
      User,
      Transaction,
      CashSession,
      Supplier,
    ]),
    TransactionsModule,
    ProductVariantsModule,
    CashSessionsModule,
    CqrsModule,
  ],
  controllers: [ReceptionsController],
  providers: [ReceptionsService],
  exports: [ReceptionsService],
})
export class ReceptionsModule {}
