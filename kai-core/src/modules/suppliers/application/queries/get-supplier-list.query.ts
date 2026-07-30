import { Injectable } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';
import {
  SupplierSearchFilters,
  SupplierListItem,
  SupplierDetailView,
} from '../read-models/supplier.read-model';

/**
 * Get Supplier List Query
 */
export class GetSupplierListQuery extends Query<{
  items: SupplierListItem[];
  total: number;
  totalPages: number;
}> {
  constructor(
    public readonly filters: SupplierSearchFilters = {},
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {
    super();
  }
}

/**
 * Get Supplier Detail Query
 */
export class GetSupplierDetailQuery extends Query<SupplierDetailView | null> {
  constructor(public readonly supplierId: string) {
    super();
  }
}

/**
 * Search Suppliers Query
 */
export class SearchSuppliersQuery extends Query<{
  items: SupplierListItem[];
  total: number;
  totalPages: number;
}> {
  constructor(
    public readonly searchText: string,
    public readonly filters: Omit<SupplierSearchFilters, 'searchText'> = {},
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {
    super();
  }
}
