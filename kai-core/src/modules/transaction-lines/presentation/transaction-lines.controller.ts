import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TransactionLinesServiceAdapter } from '../application/transaction-lines.service.adapter';

@Controller('transaction-lines')
export class TransactionLinesController {
  constructor(private readonly transactionLinesService: TransactionLinesServiceAdapter) {}

  @Get()
  async getTransactionLines(@Query('transactionId') transactionId?: string) {
    try {
      const lines = await this.transactionLinesService.getTransactionLines(transactionId);

      return {
        success: true,
        data: lines,
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
  async getTransactionLineById(@Param('id') id: string) {
    try {
      const line = await this.transactionLinesService.getTransactionLineById(id);

      if (!line) {
        throw new HttpException(
          {
            success: false,
            message: 'Transaction line not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: line,
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
}
