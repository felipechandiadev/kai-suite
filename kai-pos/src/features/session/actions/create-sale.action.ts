"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";
import type { CreateSaleApiBody, CreateSaleClientPayload } from "../lib/build-create-sale-payload";
import type { FiscalEmissionResponse } from "@/features/fiscal/types/fiscal-emission.types";

export type CreateSaleFromPosResult =
  | {
      success: true;
      documentNumber: string;
      transactionId: string;
      fiscalEmission?: FiscalEmissionResponse;
    }
  | { success: false; message: string };

/**
 * Registra una venta (transacción SALE) en la sesión de caja abierta.
 * Completa `userName` desde la sesión NextAuth (no confiar en el cliente).
 */
export async function createSaleFromPosAction(payload: CreateSaleClientPayload): Promise<CreateSaleFromPosResult> {
  const session = await getServerSession(authOptions);
  const userName = (session?.user as { userName?: string } | undefined)?.userName?.trim();
  if (!userName) {
    return {
      success: false,
      message: "No se encontró el usuario de la sesión. Cierra sesión y vuelve a ingresar.",
    };
  }

  const body: CreateSaleApiBody = { ...payload, userName };
  const res = await CashSessionsRequest.createSale(body);
  if (!res.success) {
    return { success: false, message: res.message };
  }

  return {
    success: true,
    documentNumber: res.transaction.documentNumber,
    transactionId: res.transaction.id,
    fiscalEmission: res.fiscalEmission,
  };
}
