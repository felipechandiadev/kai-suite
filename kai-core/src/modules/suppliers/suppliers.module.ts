import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Supplier } from './domain/supplier.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { Product } from '@modules/products/domain/product.entity';
import { Reception } from '@modules/receptions/domain/reception.entity';
import { SuppliersService } from './application/suppliers.service';
import { SuppliersServiceAdapter } from './application/suppliers.service.adapter';
import { SuppliersController } from './presentation/suppliers.controller';
import { SuppliersRepository } from './infrastructure/suppliers.repository';
import { PersonsModule } from '@modules/persons/persons.module';
import { GetAllSuppliersQueryHandler } from './application/handlers/queries/get-all-suppliers.handler';
import { GetSupplierQueryHandler } from './application/handlers/queries/get-supplier.handler';

// CQRS Handlers
import { CreateSupplierCommandHandler } from './application/handlers/commands/create-supplier.handler';
import { UpdateSupplierCommandHandler } from './application/handlers/commands/update-supplier.handler';
import { RemoveSupplierCommandHandler } from './application/handlers/commands/remove-supplier.handler';

// Read Model Query Handlers
import { GetSupplierListQueryHandler } from './application/queries/get-supplier-list.query-handler';
import { GetSupplierDetailQueryHandler } from './application/queries/get-supplier-list.query-handler';
import { SearchSuppliersQueryHandler } from './application/queries/get-supplier-list.query-handler';
import { SupplierReadModelQueryHandler } from './application/read-models/supplier-read-model.query-handler';

// Repository Port
import {
  SuppliersRepositoryPort,
  SUPPLIERS_REPOSITORY,
} from './application/ports/suppliers.repository.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      Person,
      Transaction,
      Product,
      Reception,
    ]),
    CqrsModule,
    PersonsModule,
  ],
  controllers: [SuppliersController],
  providers: [
    // Legacy service for backward compatibility
    SuppliersService,

    // CQRS Adapter (main service now)
    SuppliersServiceAdapter,

    // Repository implementation
    SuppliersRepository,
    {
      provide: SUPPLIERS_REPOSITORY,
      useClass: SuppliersRepository,
    },

    // Command Handlers
    CreateSupplierCommandHandler,
    UpdateSupplierCommandHandler,
    RemoveSupplierCommandHandler,
    GetAllSuppliersQueryHandler,
    GetSupplierQueryHandler,

    // Read Model Query Handlers
    SupplierReadModelQueryHandler,
    GetSupplierListQueryHandler,
    GetSupplierDetailQueryHandler,
    SearchSuppliersQueryHandler,
  ],
  exports: [SuppliersServiceAdapter, SuppliersService], // Export both for compatibility
})
export class SuppliersModule {}
