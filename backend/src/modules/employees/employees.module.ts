import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { EmployeesController } from './presentation/employees.controller';
import { EmploymentContractsController } from './presentation/employment-contracts.controller';
import { JobPositionsController } from './presentation/job-positions.controller';
import { AfpFundsController } from './presentation/afp-funds.controller';
import { EmployeesServiceAdapter } from './application/services/employees.service.adapter';
import { EmploymentContractsService } from './application/employment-contracts.service';
import { JobPositionsService } from './application/job-positions.service';
import { AfpFundsService } from './application/afp-funds.service';
import { HrEmployeeTimelineService } from './application/hr-employee-timeline.service';
import { TypeOrmEmployeeRepository } from './infrastructure/repositories/typeorm-employee.repository';
import { Employee } from './domain/employee.entity';
import { EmploymentContract } from './domain/employment-contract.entity';
import { HrJobPosition } from './domain/hr-job-position.entity';
import { HrAfpFund } from './domain/hr-afp-fund.entity';
import { HrIsapre } from './domain/hr-isapre.entity';
import { HrEmployeeTimelineEntry } from './domain/hr-employee-timeline-entry.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { User } from '@modules/users/domain/user.entity';
import { HrJornadaConfig } from '@modules/hr-jornada/domain/hr-jornada-config.entity';
import { HrShiftSystem } from '@modules/hr-jornada/domain/hr-shift-system.entity';
import { HrLaborUnitsModule } from '@modules/hr-labor-units/hr-labor-units.module';
import { CreateEmployeeCommandHandler } from './application/handlers/commands/create-employee.handler';
import { UpdateEmployeeCommandHandler } from './application/handlers/commands/update-employee.handler';
import { DeleteEmployeeCommandHandler } from './application/handlers/commands/delete-employee.handler';
import { GetAllEmployeesQueryHandler } from './application/handlers/queries/get-all-employees.handler';
import { GetEmployeeByIdQueryHandler } from './application/handlers/queries/get-employee-by-id.handler';
import { IsapresController } from './presentation/isapres.controller';
import { IsapresService } from './application/isapres.service';

@Module({
  imports: [
    CqrsModule,
    HrLaborUnitsModule,
    TypeOrmModule.forFeature([
      Employee,
      EmploymentContract,
      HrJobPosition,
      HrAfpFund,
      HrIsapre,
      HrEmployeeTimelineEntry,
      Company,
      Person,
      User,
      HrJornadaConfig,
      HrShiftSystem,
    ]),
  ],
  controllers: [
    EmployeesController,
    EmploymentContractsController,
    JobPositionsController,
    AfpFundsController,
    IsapresController,
  ],
  providers: [
    EmployeesServiceAdapter,
    EmploymentContractsService,
    JobPositionsService,
    AfpFundsService,
    IsapresService,
    HrEmployeeTimelineService,
    {
      provide: 'EmployeeRepositoryPort',
      useClass: TypeOrmEmployeeRepository,
    },
    CreateEmployeeCommandHandler,
    UpdateEmployeeCommandHandler,
    DeleteEmployeeCommandHandler,
    GetAllEmployeesQueryHandler,
    GetEmployeeByIdQueryHandler,
  ],
  exports: [
    EmployeesServiceAdapter,
    EmploymentContractsService,
    JobPositionsService,
    AfpFundsService,
    IsapresService,
    HrEmployeeTimelineService,
  ],
})
export class EmployeesModule {}
