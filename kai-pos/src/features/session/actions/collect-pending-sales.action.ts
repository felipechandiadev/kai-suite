"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";
import type { CollectPendingSalesClientPayload } from "../lib/build-collect-pending-sales-payload";

export type CollectPendingSalesFromPosResult =
  | {
      success: true;
      documentNumber: string;
      transactionId: string;
      allocations: Array<{ saleId: string; documentNumber: string; amount: number }>;
    }
  | { success: false; message: string };

export async function collectPendingSalesFromPosAction(
  payload: CollectPendingSalesClientPayload,
): Promise<CollectPendingSalesFromPosResult> {
  const session = await getServerSession(authOptions);
  const userName = (session?.user as { userName?: string } | undefined)?.userName?.trim();
  if (!userName) {
    return {
      success: false,
      message: "No se encontró el usuario de la sesión. Cierra sesión y vuelve a ingresar.",
    };
  }

  const res = await CashSessionsRequest.collectPendingSales({ ...payload, userName });
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
