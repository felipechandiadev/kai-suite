import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { CustomersController } from './presentation/customers.controller';
import { CustomersService } from './application/customers.service';
import { CustomersServiceAdapter } from './application/customers.service.adapter';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { EshopCustomerAccount } from '@modules/e-shop/domain/eshop-customer-account.entity';
import { InstallmentsModule } from '@modules/installments/installments.module';
import { CompaniesModule } from '@modules/companies/companies.module';
import { CustomerOrmEntity } from './infrastructure/orm-mappers/customer.orm-entity';

// CQRS Imports
import { CreateCustomerHandler } from './application/handlers/commands/create-customer.handler';
import { UpdateCustomerHandler } from './application/handlers/commands/update-customer.handler';
import { DeleteCustomerHandler } from './application/handlers/commands/delete-customer.handler';
import { SearchCustomersHandler } from './application/handlers/queries/search-customers.handler';
import { GetCustomerHandler } from './application/handlers/queries/get-customer.handler';
import { GetCustomerPaymentsHandler } from './application/handlers/queries/get-customer-payments.handler';
import { GetCustomerPendingPaymentsHandler } from './application/handlers/queries/get-customer-pending-payments.handler';
import { GetCustomerPurchasesHandler } from './application/handlers/queries/get-customer-purchases.handler';

// Read Model Query Handlers
import { GetCustomerListQueryHandler } from './application/queries/get-customer-list.query-handler';
import { GetCustomerDetailQueryHandler } from './application/queries/get-customer-list.query-handler';
import { SearchCustomersQueryHandler } from './application/queries/get-customer-list.query-handler';
import { CustomerReadModelQueryHandler } from './application/read-models/customer-read-model.query-handler';

// Repository
import { CustomersRepository } from './infrastructure/customers.repository';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from './application/ports/customers.repository.port';
import { CustomersSearchBootstrap } from './infrastructure/customers-search.bootstrap';
import { CustomerPaymentSourcesService } from './application/customer-payment-sources.service';
import { CustomerInternalCreditDebtService } from './application/customer-internal-credit-debt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerOrmEntity, Person, Transaction, EshopCustomerAccount]),
    InstallmentsModule,
    CompaniesModule,
    CqrsModule,
  ],
  controllers: [CustomersController],
  providers: [
    // Legacy service for backward compatibility
    CustomersService,

    // CQRS Adapter (main service now)
    CustomersServiceAdapter,

    // Repository implementation
    {
      provide: CUSTOMERS_REPOSITORY,
      useClass: CustomersRepository,
    },

    // Command Handlers
    CreateCustomerHandler,
    UpdateCustomerHandler,
    DeleteCustomerHandler,

    // Query Handlers
    SearchCustomersHandler,
    GetCustomerHandler,
    GetCustomerPaymentsHandler,
    GetCustomerPendingPaymentsHandler,
    GetCustomerPurchasesHandler,

    // Read Model Query Handlers
    CustomerReadModelQueryHandler,
    GetCustomerListQueryHandler,
    GetCustomerDetailQueryHandler,
    SearchCustomersQueryHandler,

    // Bootstrap: idempotently ensure PG `unaccent` extension exists so
    // accent-insensitive customer search works out of the box.
    CustomersSearchBootstrap,
    CustomerPaymentSourcesService,
    CustomerInternalCreditDebtService,
  ],
  exports: [
    CustomersServiceAdapter,
    CustomersService,
    CustomerPaymentSourcesService,
  ],
})
export class CustomersModule {}
