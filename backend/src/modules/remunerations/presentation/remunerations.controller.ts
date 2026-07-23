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
  BadRequestException,
} from '@nestjs/common';
import { RemunerationsService } from '../application/remunerations.service';
import { TransactionStatus } from '@modules/transactions/domain/transaction.entity';
import {
  CreateRemunerationDto,
  UpdateRemunerationDto,
} from '../application/dto/create-remuneration.dto';
import { PreviewSettlementDto } from '../application/dto/preview-settlement.dto';

@Controller('remunerations')
export class RemunerationsController {
  constructor(private readonly remunerationsService: RemunerationsService) {}

  @Get('line-types')
  getPayrollLineTypes() {
    return {
      success: true,
      data: this.remunerationsService.getPayrollLineTypeOptions(),
    };
  }

  @Post('preview-settlement')
  async previewSettlement(@Body() data: PreviewSettlementDto) {
    try {
      const result = await this.remunerationsService.previewSettlement({
        employeeId: data.employeeId,
        date: data.date,
        lines: data.lines,
        includeContractAllowances: data.includeContractAllowances,
      });
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
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

  @Get('suggestions')
  async getSuggestions(
    @Query('employeeId') employeeId?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('status') status?: string,
  ) {
    try {
      const data = await this.remunerationsService.listPayrollSuggestions({
        employeeId,
        periodStart,
        periodEnd,
        status,
      });
      return { success: true, data };
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

  @Post('suggestions/:id/accept')
  async acceptSuggestion(@Param('id') id: string) {
    try {
      const data = await this.remunerationsService.acceptPayrollSuggestion(id);
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Error',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('suggestions/:id/dismiss')
  async dismissSuggestion(@Param('id') id: string) {
    try {
      const data = await this.remunerationsService.dismissPayrollSuggestion(id);
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Error',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async getRemunerations(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    try {
      const statusFilter = (status as TransactionStatus) || undefined;
      const data = await this.remunerationsService.getAllRemunerations({
        employeeId,
        status: statusFilter,
      });
      return { success: true, data };
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
  async getRemunerationById(@Param('id') id: string) {
    try {
      const remuneration =
        await this.remunerationsService.getRemunerationById(id);
      if (!remuneration) {
        throw new HttpException(
          { success: false, message: 'Remuneration not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { success: true, data: remuneration };
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
  async createRemuneration(@Body() data: CreateRemunerationDto) {
    try {
      const remuneration = await this.remunerationsService.createRemuneration({
        employeeId: data.employeeId,
        date: data.date,
        resultCenterId: data.resultCenterId,
        lines: data.lines,
        userId: data.userId,
        plannedPayments: data.plannedPayments,
        settlementPayment: data.settlementPayment
          ? {
              mode: data.settlementPayment.mode,
              partialPaidAmount: data.settlementPayment.partialPaidAmount,
              paidLines: data.settlementPayment.paidLines ?? [],
              scheduledLines: data.settlementPayment.scheduledLines ?? [],
            }
          : undefined,
        autoCreateOperationalExpenses: data.autoCreateOperationalExpenses,
        autoSuggestStatutory: data.autoSuggestStatutory,
      });
      return { success: true, data: remuneration };
    } catch (error) {
      if (error instanceof BadRequestException) {
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
  async updateRemuneration(
    @Param('id') id: string,
    @Body() data: UpdateRemunerationDto,
  ) {
    try {
      const updated = await this.remunerationsService.updateRemuneration(id, {
        date: data.date,
        status: data.status as TransactionStatus | undefined,
        resultCenterId: data.resultCenterId,
        lines: data.lines,
      });
      if (!updated) {
        throw new HttpException(
          { success: false, message: 'Remuneration not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { success: true, data: updated };
    } catch (error) {
      if (error instanceof HttpException || error instanceof BadRequestException) {
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
  async deleteRemuneration(@Param('id') id: string) {
    try {
      await this.remunerationsService.deleteRemuneration(id);
      return { success: true };
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
