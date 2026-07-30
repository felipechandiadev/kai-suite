import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OrganizationalUnit } from './domain/organizational-unit.entity';
import { OrganizationalUnitsService } from './application/organizational-units.service';
import { OrganizationalUnitsController } from './presentation/organizational-units.controller';
import { Company } from '../companies/domain/company.entity';
import { HrLaborUnitsModule } from '@modules/hr-labor-units/hr-labor-units.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationalUnit, Company]),
    CqrsModule,
    HrLaborUnitsModule,
  ],
  controllers: [OrganizationalUnitsController],
  providers: [OrganizationalUnitsService],
  exports: [OrganizationalUnitsService],
})
export class OrganizationalUnitsModule {}
