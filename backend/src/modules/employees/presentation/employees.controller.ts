import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EmployeesServiceAdapter } from '../application/services/employees.service.adapter';
import { EmployeeStatus } from '../domain/employee.entity';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesServiceAdapter) {}

  @Get()
  async getEmployees(
    @Query('includeTerminated') includeTerminated?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
  ) {
    try {
      const include = includeTerminated === 'true' || includeTerminated === '1';
      const statusFilter = (status as EmployeeStatus) || undefined;

      const employees = await this.employeesService.getAllEmployees({
        includeTerminated: include,
        status: statusFilter,
        branchId,
        companyId,
      });

      return {
        success: true,
        data: employees,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getEmployeeById(@Param('id') id: string) {
    try {
      const employee = await this.employeesService.getEmployeeById(id);

      if (!employee) {
        throw new HttpException(
          {
            success: false,
            message: 'Employee not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createEmployee(
    @Body()
    data: {
      personId: string;
      companyId?: string;
      branchId?: string;
      resultCenterId?: string;
      organizationalUnitId?: string;
      employmentType: string;
      hireDate: string;
      baseSalary?: string;
      metadata?: Record<string, unknown>;
      alsoAsUser?: {
        userName: string;
        mail: string;
        password: string;
        rol?: string;
      };
    },
  ) {
    try {
      const result = await this.employeesService.createEmployee(data);
      return {
        success: true,
        data: result.employee,
        user: result.user,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      branchId?: string | null;
      resultCenterId?: string | null;
      organizationalUnitId?: string | null;
      employmentType: string;
      status: EmployeeStatus;
      terminationDate?: string | null;
      baseSalary?: string | null;
      metadata?: Record<string, unknown>;
    }>,
  ) {
    try {
      const updated = await this.employeesService.updateEmployee(id, data);

      if (!updated) {
        throw new HttpException(
          {
            success: false,
            message: 'Employee not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteEmployee(@Param('id') id: string) {
    try {
      await this.employeesService.deleteEmployee(id);
      return {
        success: true,
        message: 'Employee deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
