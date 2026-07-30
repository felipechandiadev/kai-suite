import { BaseQuery } from '@shared/cqrs/base.query';
import {
  TransactionType,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';

export class GetTransactionSummaryQuery extends BaseQuery {
  constructor(public readonly transactionId: string) {
    super();
  }
}

export class GetTransactionDetailQuery extends BaseQuery {
  constructor(public readonly transactionId: string) {
    super();
  }
}

export class ListTransactionsQuery extends BaseQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly transactionType?: TransactionType,
    public readonly status?: TransactionStatus,
    public readonly customerId?: string,
    public readonly branchId?: string,
    public readonly userId?: string,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly minAmount?: number,
    public readonly maxAmount?: number,
    public readonly search?: string,
  ) {
    super();
  }
}

export class GetCustomerTransactionHistoryQuery extends BaseQuery {
  constructor(
    public readonly customerId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {
    super();
  }
}

export class GetBranchTransactionSummaryQuery extends BaseQuery {
  constructor(
    public readonly branchId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {
    super();
  }
}

export class GetTransactionEventsQuery extends BaseQuery {
  constructor(
    public readonly transactionId: string,
    public readonly limit: number = 50,
  ) {
    super();
  }
}
