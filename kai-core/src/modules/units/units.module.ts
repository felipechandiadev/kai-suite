import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Unit } from './domain/unit.entity';
import { UnitsService } from './application/units.service';
import { UnitsServiceAdapter } from './application/units.service.adapter';
import { UnitsController } from './presentation/units.controller';
import { GetAllUnitsQueryHandler } from './application/handlers/queries/get-all-units.handler';
import { GetUnitByIdQueryHandler } from './application/handlers/queries/get-unit-by-id.handler';
import { UnitOrmEntity } from './infrastructure/orm-mappers/unit.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, UnitOrmEntity]), CqrsModule],
  controllers: [UnitsController],
  providers: [UnitsService, UnitsServiceAdapter, GetAllUnitsQueryHandler, GetUnitByIdQueryHandler],
  exports: [UnitsService, UnitsServiceAdapter],
})
export class UnitsModule {}
