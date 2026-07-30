import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { RecipesModule } from '@modules/recipes/recipes.module';
import { HrLaborUnitsModule } from '@modules/hr-labor-units/hr-labor-units.module';
import { ProductionUnit } from './domain/production-unit.entity';
import { ProductionUnitEmployee } from './domain/production-unit-employee.entity';
import { ProductionUnitsService } from './application/production-units.service';
import { ProductionUnitCostingService } from './application/production-unit-costing.service';
import { ProductionUnitsController } from './presentation/production-units.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionUnit,
      ProductionUnitEmployee,
      Branch,
      Storage,
      Employee,
      EmploymentContract,
      ProductVariant,
      Transaction,
      TransactionLine,
    ]),
    HrLaborUnitsModule,
    RecipesModule,
  ],
  controllers: [ProductionUnitsController],
  providers: [ProductionUnitsService, ProductionUnitCostingService],
  exports: [ProductionUnitsService, ProductionUnitCostingService],
})
export class ProductionUnitsModule {}
