"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";
import type { ConfirmCustomerReturnDocumentApiBody } from "../lib/build-create-sale-return-payload";
import type { ConfirmCustomerReturnDocumentClientPayload } from "../lib/build-create-sale-return-payload";

export type ConfirmCustomerReturnDocumentResult =
  | {
      success: true;
      originalSale: { id: string; documentNumber: string };
      saleReturn: {
        id: string;
        documentNumber: string;
        total: number;
        subtotal: number;
        taxAmount: number;
        discountAmount: number;
      };
      creditNote: { id: string; documentNumber: string; total: number };
    }
  | { success: false; message: string };

export async function confirmCustomerReturnDocumentAction(
  payload: ConfirmCustomerReturnDocumentClientPayload,
): Promise<ConfirmCustomerReturnDocumentResult> {
  const session = await getServerSession(authOptions);
  const userName = (session?.user as { userName?: string } | undefined)?.userName?.trim();
  if (!userName) {
    return {
      success: false,
      message: "No se encontró el usuario de la sesión. Cierra sesión y vuelve a ingresar.",
    };
  }

  const body: ConfirmCustomerReturnDocumentApiBody = { ...payload, userName };
  const res = await CashSessionsRequest.confirmCustomerReturnDocument(body);
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
