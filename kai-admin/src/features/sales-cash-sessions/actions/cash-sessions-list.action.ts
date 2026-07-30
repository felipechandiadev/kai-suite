"use server";

import {
  CashSessionsListRequest,
  type ListCashSessionsParams,
} from "../infrastructure/cash-sessions-list.request";

export async function listCashSessionsAction(
  params: ListCashSessionsParams = {},
) {
  return CashSessionsListRequest.list(params);
}
