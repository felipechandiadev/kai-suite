"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";
import type { CollectPendingQuotasClientPayload } from "../lib/build-collect-pending-quotas-payload";

export type CollectPendingQuotasFromPosResult =
  | {
      success: true;
      documentNumber: string;
      transactionId: string;
      allocations: Array<{
        installmentId: string;
        saleTransactionId: string;
        documentNumber: string;
        amount: number;
      }>;
    }
  | { success: false; message: string };

export async function collectPendingQuotasFromPosAction(
  payload: CollectPendingQuotasClientPayload,
): Promise<CollectPendingQuotasFromPosResult> {
  const session = await getServerSession(authOptions);
  const userName = (session?.user as { userName?: string } | undefined)?.userName?.trim();
  if (!userName) {
    return {
      success: false,
      message: "No se encontró el usuario de la sesión. Cierra sesión y vuelve a ingresar.",
    };
  }

  const res = await CashSessionsRequest.collectPendingQuotas({ ...payload, userName });
  if (!res.success) {
    return { success: false, message: res.message };
  }

  return {
    success: true,
    documentNumber: res.paymentIn.documentNumber,
    transactionId: res.paymentIn.id,
    allocations: res.allocations,
  };
}
