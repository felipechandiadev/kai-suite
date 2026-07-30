"use server";

import { CashSessionDetailRequest } from "../infrastructure/cash-session-detail.request";

export async function getCashSessionDetailAction(cashSessionId: string) {
  return CashSessionDetailRequest.getById(cashSessionId);
}
