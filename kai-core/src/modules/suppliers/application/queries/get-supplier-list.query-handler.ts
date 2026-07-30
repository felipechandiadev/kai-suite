import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SupplierReadModelQueryHandler } from '../read-models/supplier-read-model.query-handler';
import {
  GetSupplierListQuery,
  GetSupplierDetailQuery,
  SearchSuppliersQuery,
} from './get-supplier-list.query';

/**
 * Get Supplier List Query Handler
 */
@Injectable()
@QueryHandler(GetSupplierListQuery)
export class GetSupplierListQueryHandler implements IQueryHandler<GetSupplierListQuery> {
  constructor(
    private readonly readModelHandler: SupplierReadModelQueryHandler,
  ) {}

  async execute(query: GetSupplierListQuery) {
    return this.readModelHandler.getSupplierList(
      query.filters,
      query.page,
      query.pageSize,
    );
  }
}

/**
 * Get Supplier Detail Query Handler
 */
@Injectable()
@QueryHandler(GetSupplierDetailQuery)
export class GetSupplierDetailQueryHandler implements IQueryHandler<GetSupplierDetailQuery> {
  constructor(
    private readonly readModelHandler: SupplierReadModelQueryHandler,
  ) {}

  async execute(query: GetSupplierDetailQuery) {
    return this.readModelHandler.getSupplierDetail(query.supplierId);
  }
}

/**
 * Search Suppliers Query Handler
 */
@Injectable()
@QueryHandler(SearchSuppliersQuery)
export class SearchSuppliersQueryHandler implements IQueryHandler<SearchSuppliersQuery> {
  constructor(
    private readonly readModelHandler: SupplierReadModelQueryHandler,
  ) {}

  async execute(query: SearchSuppliersQuery) {
    return this.readModelHandler.searchSuppliers(
      query.searchText,
      query.filters,
      query.page,
      query.pageSize,
    );
  }
}
