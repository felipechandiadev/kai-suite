import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { BankAccountsController } from './presentation/bank-accounts.controller';
import { BankAccountsServiceAdapter } from './application/bank-accounts.service.adapter';
import { TypeOrmBankAccountsRepository } from './infrastructure/repositories/typeorm-bank-accounts.repository';
import { Person } from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { GetCashBalanceQueryHandler } from './application/handlers/queries/get-cash-balance.handler';
import { GetBankAccountsQueryHandler } from './application/handlers/queries/get-bank-accounts.handler';
import { GetBankAccountByIdQueryHandler } from './application/handlers/queries/get-bank-account-by-id.handler';
import { CreateBankAccountCommandHandler } from './application/handlers/commands/create-bank-account.handler';
import { UpdateBankAccountCommandHandler } from './application/handlers/commands/update-bank-account.handler';
import { DeleteBankAccountCommandHandler } from './application/handlers/commands/delete-bank-account.handler';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([Person, Company])],
  controllers: [BankAccountsController],
  providers: [
    BankAccountsServiceAdapter,
    {
      provide: 'BankAccountsRepositoryPort',
      useClass: TypeOrmBankAccountsRepository,
    },
    GetCashBalanceQueryHandler,
    GetBankAccountsQueryHandler,
    GetBankAccountByIdQueryHandler,
    CreateBankAccountCommandHandler,
    UpdateBankAccountCommandHandler,
    DeleteBankAccountCommandHandler,
  ],
  exports: [BankAccountsServiceAdapter],
})
export class BankAccountsModule {}
