import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { OrganizationalUnit } from '@modules/organizational-units/domain/organizational-unit.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { HrLaborUnit } from './domain/hr-labor-unit.entity';
import { HrLaborUnitStorage } from './domain/hr-labor-unit-storage.entity';
import { HrLaborUnitBranch } from './domain/hr-labor-unit-branch.entity';
import { HrLaborUnitOrganizationalUnit } from './domain/hr-labor-unit-organizational-unit.entity';
import { HrLaborUnitProductionUnit } from './domain/hr-labor-unit-production-unit.entity';
import { LaborUnitsService } from './application/labor-units.service';
import { LaborUnitsController } from './presentation/labor-units.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HrLaborUnit,
      HrLaborUnitStorage,
      HrLaborUnitBranch,
      HrLaborUnitOrganizationalUnit,
      HrLaborUnitProductionUnit,
      Branch,
      Storage,
      OrganizationalUnit,
      ProductionUnit,
    ]),
  ],
  controllers: [LaborUnitsController],
  providers: [LaborUnitsService],
  exports: [LaborUnitsService],
})
export class HrLaborUnitsModule {}
