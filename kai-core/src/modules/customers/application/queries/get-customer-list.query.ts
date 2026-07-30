import { Injectable } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';
import {
  CustomerSearchFilters,
  CustomerListItem,
  CustomerDetailView,
} from '../read-models/customer.read-model';

/**
 * Get Customer List Query
 */
export class GetCustomerListQuery extends Query<{
  items: CustomerListItem[];
  total: number;
  totalPages: number;
}> {
  constructor(
    public readonly filters: CustomerSearchFilters = {},
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {
    super();
  }
}

/**
 * Get Customer Detail Query
 */
export class GetCustomerDetailQuery extends Query<CustomerDetailView | null> {
  constructor(public readonly customerId: string) {
    super();
  }
}

/**
 * Search Customers Query
 */
export class SearchCustomersQuery extends Query<{
  items: CustomerListItem[];
  total: number;
  totalPages: number;
}> {
  constructor(
    public readonly searchText: string,
    public readonly filters: Omit<CustomerSearchFilters, 'searchText'> = {},
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {
    super();
  }
}
