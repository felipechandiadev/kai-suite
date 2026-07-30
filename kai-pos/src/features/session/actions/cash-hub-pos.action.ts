"use server";

import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";

export async function listCashHubsForPosAction(pointOfSaleId: string) {
  const id = typeof pointOfSaleId === "string" ? pointOfSaleId.trim() : "";
  if (!id) {
    return { success: false as const, message: "Punto de venta no especificado" };
  }
  return CashSessionsRequest.listCashHubsForPointOfSale(id);
}
