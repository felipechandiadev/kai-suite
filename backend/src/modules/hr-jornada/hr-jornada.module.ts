import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Employee } from '@modules/employees/domain/employee.entity';
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
import { HrJornadaService } from './application/hr-jornada.service';
import { HrJornadaSchemaBootstrap } from './application/hr-jornada-schema.bootstrap';
import { HrJornadaController } from './presentation/hr-jornada.controller';

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
      Employee,
    ]),
  ],
  controllers: [HrJornadaController],
  providers: [HrJornadaService, HrJornadaSchemaBootstrap],
  exports: [HrJornadaService],
})
export class HrJornadaModule {}
