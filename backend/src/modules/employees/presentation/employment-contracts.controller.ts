import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EmploymentContractsService } from '../application/employment-contracts.service';
import {
  EmploymentContractKind,
  EmploymentContractStatus,
  EmploymentLaborType,
  SalesCommissionType,
} from '../domain/employment-contract.enums';
import { WorkRegime } from '../domain/employee.entity';
import { HrEmployeeTimelineService } from '../application/hr-employee-timeline.service';

@Controller('employees')
export class EmploymentContractsController {
  constructor(
    private readonly contractsService: EmploymentContractsService,
    private readonly timelineService: HrEmployeeTimelineService,
  ) {}

  private wrap<T>(fn: () => Promise<T>) {
    return fn().catch((error) => {
      if (error instanceof HttpException) throw error;
      const msg = error instanceof Error ? error.message : 'Error';
      const status = msg.toLowerCase().includes('no encontrad')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      throw new HttpException({ success: false, message: msg }, status);
    });
  }

  /** Only DRAFT documentUrl; business fields are immutable. */
  @Patch('contracts/:contractId')
  async update(
    @Param('contractId') contractId: string,
    @Body() body: { documentUrl?: string | null },
  ) {
    if (body.documentUrl === undefined) {
      throw new HttpException(
        {
          success: false,
          message:
            'Los contratos no se actualizan; cree una nueva versión con POST /contracts (activate: true)',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return {
      success: true,
      data: await this.wrap(() =>
        this.contractsService.updateDocumentUrl(
          contractId,
          body.documentUrl ?? null,
        ),
      ),
    };
  }

  @Post('contracts/:contractId/activate')
  async activate(@Param('contractId') contractId: string) {
    return {
      success: true,
      data: await this.wrap(() => this.contractsService.activate(contractId)),
    };
  }

  @Get(':employeeId/contracts')
  async list(@Param('employeeId') employeeId: string) {
    return {
      success: true,
      data: await this.wrap(() => this.contractsService.listByEmployee(employeeId)),
    };
  }

  @Get(':employeeId/contracts/active')
  async active(@Param('employeeId') employeeId: string) {
    return {
      success: true,
      data: await this.wrap(() => this.contractsService.getActive(employeeId)),
    };
  }

  @Get(':employeeId/timeline')
  async timeline(@Param('employeeId') employeeId: string) {
    return {
      success: true,
      data: await this.wrap(() => this.timelineService.list(employeeId)),
    };
  }

  @Post(':employeeId/timeline')
  async addNote(
    @Param('employeeId') employeeId: string,
    @Body() body: { body: string },
  ) {
    return {
      success: true,
      data: await this.wrap(() =>
        this.timelineService.addNote(employeeId, body.body ?? ''),
      ),
    };
  }

  @Post(':employeeId/contracts')
  async create(
    @Param('employeeId') employeeId: string,
    @Body()
    body: {
      kind: EmploymentContractKind;
      laborType?: EmploymentLaborType | null;
      status?: EmploymentContractStatus;
      startDate: string;
      endDate?: string | null;
      branchId?: string | null;
      baseSalary?: string | null;
      feeAmount?: string | null;
      workRegime?: WorkRegime;
      mealAllowance?: string;
      transportAllowance?: string;
      tipsEligible?: boolean;
      afpId?: string | null;
      afpCode?: string | null;
      afpName?: string | null;
      afpContributionPercent?: string | null;
      healthSystem?: string | null;
      notes?: string | null;
      documentUrl?: string | null;
      jobPositionId?: string | null;
      duties?: string | null;
      salesCommissionType?: SalesCommissionType;
      salesCommissionValue?: string | null;
      activate?: boolean;
    },
  ) {
    return {
      success: true,
      data: await this.wrap(() =>
        this.contractsService.create({ ...body, employeeId }),
      ),
    };
  }
}
