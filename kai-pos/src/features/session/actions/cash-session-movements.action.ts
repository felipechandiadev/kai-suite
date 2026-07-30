"use server";

import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";

export async function listCashSessionMovementsAction(cashSessionId: string) {
  const id = typeof cashSessionId === "string" ? cashSessionId.trim() : "";
  if (!id) {
    return { success: false as const, message: "Sesión de caja no especificada" };
  }
  return CashSessionsRequest.listMovements(id);
}
