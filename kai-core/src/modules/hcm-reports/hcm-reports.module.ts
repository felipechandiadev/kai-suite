import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrShiftInstance } from '@modules/hr-jornada/domain/hr-shift-instance.entity';
import { HrShiftException } from '@modules/hr-jornada/domain/hr-shift-exception.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { HcmReportsController } from './presentation/hcm-reports.controller';
import { HcmReportRunner } from './application/hcm-report.runner';
import { HcmReportsQueryService } from './application/hcm-reports-query.service';
import { HoursPlannedByEmployeeHandler } from './application/handlers/hours-planned.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([HrShiftInstance, HrShiftException, Employee]),
  ],
  controllers: [HcmReportsController],
  providers: [
    HcmReportsQueryService,
    HcmReportRunner,
    HoursPlannedByEmployeeHandler,
  ],
  exports: [HcmReportRunner],
})
export class HcmReportsModule {}
