"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";
import type { PayoutCustomerCreditNotesClientPayload } from "../lib/build-payout-customer-credit-notes-payload";

export type PayoutCustomerCreditNotesFromPosResult =
  | {
      success: true;
      documentNumber: string;
      transactionId: string;
      allocations: Array<{ creditNoteId: string; documentNumber: string; amount: number }>;
    }
  | { success: false; message: string };

export async function payoutCustomerCreditNotesFromPosAction(
  payload: PayoutCustomerCreditNotesClientPayload,
): Promise<PayoutCustomerCreditNotesFromPosResult> {
  const session = await getServerSession(authOptions);
  const userName = (session?.user as { userName?: string } | undefined)?.userName?.trim();
  if (!userName) {
    return {
      success: false,
      message: "No se encontró el usuario de la sesión. Cierra sesión y vuelve a ingresar.",
    };
  }

  const res = await CashSessionsRequest.payoutCustomerCreditNotes({ ...payload, userName });
  if (!res.success) {
    return { success: false, message: res.message };
  }

  return {
    success: true,
    documentNumber: res.payout.documentNumber,
    transactionId: res.payout.id,
    allocations: res.allocations,
  };
}
