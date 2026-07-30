import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetTransactionByIdQuery } from './queries/get-transaction-by-id.query';
import { GetTransactionSummaryQuery, GetTransactionDetailQuery, ListTransactionsQuery, GetCustomerTransactionHistoryQuery } from './queries/transaction-queries';

@Injectable()
export class TransactionsServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async getTransactionById(id: string) {
    return this.queryBus.execute(new GetTransactionByIdQuery(id));
  }

  async getTransactionSummary(transactionId: string) {
    return this.queryBus.execute(new GetTransactionSummaryQuery(transactionId));
  }

  async getTransactionDetail(transactionId: string) {
    return this.queryBus.execute(new GetTransactionDetailQuery(transactionId));
  }

  async listTransactions(
    page: number = 1,
    limit: number = 20,
    transactionType?: any,
    status?: any,
    customerId?: string,
    branchId?: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    minAmount?: number,
    maxAmount?: number,
    search?: string,
  ) {
    return this.queryBus.execute(new ListTransactionsQuery(
      page, limit, transactionType, status, customerId, branchId, userId,
      startDate, endDate, minAmount, maxAmount, search
    ));
  }

  async getCustomerTransactionHistory(
    customerId: string,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.queryBus.execute(new GetCustomerTransactionHistoryQuery(customerId, page, limit, startDate, endDate));
  }
}