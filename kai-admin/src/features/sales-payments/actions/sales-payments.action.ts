"use server";

import {
  ListSalesPaymentsParams,
  SalesPaymentsRequest,
} from "../infrastructure/sales-payments.request";

export async function listSalesPaymentsAction(
  params: ListSalesPaymentsParams = {},
) {
  return SalesPaymentsRequest.list(params);
}
