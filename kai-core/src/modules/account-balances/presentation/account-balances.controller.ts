import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AccountBalancesServiceAdapter } from '../application/services/account-balances.service.adapter';
import { GetAccountBalancesDto } from '../application/dto/get-account-balances.dto';
import { UpdateBalancesForLedgerEntriesDto } from '../application/dto/update-balances-for-ledger-entries.dto';

@Controller('account-balances')
export class AccountBalancesController {
  constructor(
    private readonly accountBalancesService: AccountBalancesServiceAdapter,
  ) {}

  @Get()
  async getBalances(@Query() query: GetAccountBalancesDto) {
    try {
      const balances = await this.accountBalancesService.getBalancesForPeriod(
        query.companyId,
        query.periodId,
      );

      return {
        success: true,
        data: balances,
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

  @Post('update-for-ledger-entries')
  async updateBalancesForLedgerEntries(
    @Body() data: UpdateBalancesForLedgerEntriesDto,
  ) {
    try {
      await this.accountBalancesService.updateBalancesForLedgerEntries(
        data.ledgerEntries,
      );

      return {
        success: true,
        message: 'Balances updated successfully',
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

  @Post('freeze-for-period/:periodId')
  async freezeBalancesForPeriod(@Param('periodId') periodId: string) {
    try {
      await this.accountBalancesService.freezeBalancesForPeriod(periodId);

      return {
        success: true,
        message: 'Balances frozen successfully',
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
