"use server";

import { CashSessionDetailRequest } from "../infrastructure/cash-session-detail.request";

export async function getCashSessionDetailAction(cashSessionId: string) {
  return CashSessionDetailRequest.getById(cashSessionId);
}

/** RSC / page loader. */
export async function getCashSessionDetailForPage(cashSessionId: string) {
  return CashSessionDetailRequest.getById(cashSessionId);
}
