"use server";

import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";

export async function closeCashSessionAction(input: {
  cashSessionId: string;
  userId: string;
  notes?: string;
  cashHubId?: string;
  counted?: {
    cash: number;
    debitCard: number;
    creditCard: number;
    transfer: number;
    check: number;
    other: number;
  };
}) {
  return CashSessionsRequest.close(input);
}
