"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";
import type { CreateBackorderClientPayload } from "../lib/build-create-backorder-payload";

export type CreateBackorderFromPosResult =
  | { success: true; documentNumber: string; transactionId: string }
  | { success: false; message: string };

/**
 * Registra un encargo (transacción BACKORDER) en la sesión de caja abierta.
 */
export async function createBackorderFromPosAction(
  payload: CreateBackorderClientPayload,
): Promise<CreateBackorderFromPosResult> {
  const session = await getServerSession(authOptions);
  const userName = (session?.user as { userName?: string } | undefined)?.userName?.trim();
  if (!userName) {
    return {
      success: false,
      message: "No se encontró el usuario de la sesión. Cierra sesión y vuelve a ingresar.",
    };
  }

  const body = { ...payload, userName };
  const res = await CashSessionsRequest.createBackorder(body);
  if (!res.success) {
    return { success: false, message: res.message };
  }

  return {
    success: true,
    documentNumber: res.transaction.documentNumber,
    transactionId: res.transaction.id,
  };
}
