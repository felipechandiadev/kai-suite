"use server";

import {
  ListSupplierPaymentsParams,
  SupplierPaymentsRequest,
} from "../infrastructure/supplier-payments.request";

export async function listSupplierPaymentsAction(
  params: ListSupplierPaymentsParams = {},
) {
  return SupplierPaymentsRequest.list(params);
}
