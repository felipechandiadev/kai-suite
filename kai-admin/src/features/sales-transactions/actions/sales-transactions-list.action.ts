"use server";

import {
  SalesTransactionsListRequest,
  type ListSalesTransactionsParams,
} from "../infrastructure/sales-transactions-list.request";

export async function listSalesTransactionsAction(
  params: ListSalesTransactionsParams = {},
) {
  return SalesTransactionsListRequest.listSales(params);
}

export async function listCustomerSaleReturnsAction(
  params: ListSalesTransactionsParams = {},
) {
  return SalesTransactionsListRequest.listCustomerReturns(params);
}

export async function listBackordersAction(
  params: ListSalesTransactionsParams = {},
) {
  return SalesTransactionsListRequest.listBackorders(params);
}
