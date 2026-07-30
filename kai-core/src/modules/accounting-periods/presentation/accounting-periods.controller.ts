import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AccountingPeriodsService } from '../application/accounting-periods.service';
import { QueryAccountingPeriodsDto } from '../application/dto/query-accounting-periods.dto';
import { CreateAccountingPeriodDto } from '../application/dto/create-accounting-period.dto';
import { EnsureAccountingPeriodDto } from '../application/dto/ensure-accounting-period.dto';
import { CloseAccountingPeriodDto } from '../application/dto/close-accounting-period.dto';

@Controller('accounting/periods')
export class AccountingPeriodsController {
  constructor(
    private readonly accountingPeriodsService: AccountingPeriodsService,
  ) {}

  @Get()
  async findAll(@Query() query: QueryAccountingPeriodsDto) {
    try {
      const params = {
        companyId: query.companyId,
        status: query.status,
        year: query.year,
      };

      const periods = await this.accountingPeriodsService.findAll(params);

      return {
        success: true,
        data: periods,
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
  async findOne(@Param('id') id: string) {
    try {
      const period = await this.accountingPeriodsService.findOne(id);

      if (!period) {
        throw new HttpException(
          {
            success: false,
            message: 'Accounting period not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: period,
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
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: CreateAccountingPeriodDto) {
    try {
      const period = await this.accountingPeriodsService.create(data);

      return {
        success: true,
        data: period,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        error instanceof Error && error.message.includes('overlaps')
          ? HttpStatus.CONFLICT
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('ensure')
  @HttpCode(HttpStatus.OK)
  async ensurePeriod(@Body() data: EnsureAccountingPeriodDto) {
    try {
      const period = await this.accountingPeriodsService.ensurePeriod(
        data.date,
        data.companyId,
      );

      return {
        success: true,
        data: period,
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

  @Put(':id/close')
  async closePeriod(
    @Param('id') id: string,
    @Body() data?: CloseAccountingPeriodDto,
  ) {
    try {
      const period = await this.accountingPeriodsService.closePeriod(
        id,
        data?.userId,
      );

      return {
        success: true,
        data: period,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        error instanceof Error && error.message.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id/reopen')
  async reopenPeriod(@Param('id') id: string) {
    try {
      const period = await this.accountingPeriodsService.reopenPeriod(id);

      return {
        success: true,
        data: period,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        error instanceof Error && error.message.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST,
      );
    }
  }
}
