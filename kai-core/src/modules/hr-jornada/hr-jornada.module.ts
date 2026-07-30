import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Employee } from '@modules/employees/domain/employee.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import { EmployeesModule } from '@modules/employees/employees.module';
import { HrJornadaConfig } from './domain/hr-jornada-config.entity';
import { HrHoliday, HrHolidayOverride } from './domain/hr-holiday.entity';
import { HrShiftTemplate } from './domain/hr-shift-template.entity';
import { HrShiftInstance } from './domain/hr-shift-instance.entity';
import { HrShiftAssignment } from './domain/hr-shift-assignment.entity';
import { HrShiftException } from './domain/hr-shift-exception.entity';
import { HrCompensatoryLedgerEntry } from './domain/hr-compensatory-ledger-entry.entity';
import { HrScheduleFindingAudit } from './domain/hr-schedule-finding-audit.entity';
import { HrEmployeeDocument } from './domain/hr-employee-document.entity';
import { HrTimeEntry } from './domain/hr-time-entry.entity';
import { HrEmployeeShift } from './domain/hr-employee-shift.entity';
import { HrLaborUnitShift } from './domain/hr-labor-unit-shift.entity';
import { HrLaborUnitShiftMember } from './domain/hr-labor-unit-shift-member.entity';
import { HrShiftSystem } from './domain/hr-shift-system.entity';
import { HrLaborUnit } from '@modules/hr-labor-units/domain/hr-labor-unit.entity';
import { HrJornadaService } from './application/hr-jornada.service';
import { LaborUnitShiftsService } from './application/labor-unit-shifts.service';
import { ShiftSystemsService } from './application/shift-systems.service';
import { HrJornadaSchemaBootstrap } from './application/hr-jornada-schema.bootstrap';
import { HrJornadaController } from './presentation/hr-jornada.controller';
import { LaborUnitShiftsController } from './presentation/labor-unit-shifts.controller';
import { ShiftSystemsController } from './presentation/shift-systems.controller';

@Module({
  imports: [
    CqrsModule,
    forwardRef(() => EmployeesModule),
    TypeOrmModule.forFeature([
      HrJornadaConfig,
      HrHoliday,
      HrHolidayOverride,
      HrShiftTemplate,
      HrShiftInstance,
      HrShiftAssignment,
      HrShiftException,
      HrCompensatoryLedgerEntry,
      HrScheduleFindingAudit,
      HrEmployeeDocument,
      HrTimeEntry,
      HrEmployeeShift,
      HrLaborUnitShift,
      HrLaborUnitShiftMember,
      HrShiftSystem,
      HrLaborUnit,
      Employee,
      EmploymentContract,
    ]),
  ],
  controllers: [HrJornadaController, LaborUnitShiftsController, ShiftSystemsController],
  providers: [HrJornadaService, LaborUnitShiftsService, ShiftSystemsService, HrJornadaSchemaBootstrap],
  exports: [HrJornadaService, LaborUnitShiftsService, ShiftSystemsService],
})
export class HrJornadaModule {}
