"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";
import type { ConfirmCustomerReturnRefundApiBody } from "../lib/build-create-sale-return-payload";
import type { ConfirmCustomerReturnRefundClientPayload } from "../lib/build-create-sale-return-payload";
import type { ConfirmCustomerReturnDocumentResult } from "./confirm-customer-return-document.action";

export type ConfirmCustomerReturnRefundResult = ConfirmCustomerReturnDocumentResult;

export async function confirmCustomerReturnRefundAction(
  payload: ConfirmCustomerReturnRefundClientPayload,
): Promise<ConfirmCustomerReturnRefundResult> {
  const session = await getServerSession(authOptions);
  const userName = (session?.user as { userName?: string } | undefined)?.userName?.trim();
  if (!userName) {
    return {
      success: false,
      message: "No se encontró el usuario de la sesión. Cierra sesión y vuelve a ingresar.",
    };
  }

  const body: ConfirmCustomerReturnRefundApiBody = { ...payload, userName };
  const res = await CashSessionsRequest.confirmCustomerReturnRefund(body);
  if (!res.success) {
    return { success: false, message: res.message };
  }

  return {
    success: true,
    originalSale: res.originalSale,
    saleReturn: res.saleReturn,
    creditNote: res.creditNote,
  };
}
