import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CustomerReadModelQueryHandler } from '../read-models/customer-read-model.query-handler';
import {
  GetCustomerListQuery,
  GetCustomerDetailQuery,
  SearchCustomersQuery,
} from './get-customer-list.query';

/**
 * Get Customer List Query Handler
 */
@Injectable()
@QueryHandler(GetCustomerListQuery)
export class GetCustomerListQueryHandler implements IQueryHandler<GetCustomerListQuery> {
  constructor(
    private readonly readModelHandler: CustomerReadModelQueryHandler,
  ) {}

  async execute(query: GetCustomerListQuery) {
    return this.readModelHandler.getCustomerList(
      query.filters,
      query.page,
      query.pageSize,
    );
  }
}

/**
 * Get Customer Detail Query Handler
 */
@Injectable()
@QueryHandler(GetCustomerDetailQuery)
export class GetCustomerDetailQueryHandler implements IQueryHandler<GetCustomerDetailQuery> {
  constructor(
    private readonly readModelHandler: CustomerReadModelQueryHandler,
  ) {}

  async execute(query: GetCustomerDetailQuery) {
    return this.readModelHandler.getCustomerDetail(query.customerId);
  }
}

/**
 * Search Customers Query Handler
 */
@Injectable()
@QueryHandler(SearchCustomersQuery)
export class SearchCustomersQueryHandler implements IQueryHandler<SearchCustomersQuery> {
  constructor(
    private readonly readModelHandler: CustomerReadModelQueryHandler,
  ) {}

  async execute(query: SearchCustomersQuery) {
    return this.readModelHandler.searchCustomers(
      query.searchText,
      query.filters,
      query.page,
      query.pageSize,
    );
  }
}
