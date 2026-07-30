"use server";

import { PosBackorderFulfillRequest } from "../infrastructure/pos-backorder-fulfill.request";

export async function findBackorderForFulfillPosAction(
  documentNumber: string,
  pointOfSaleId?: string | null,
) {
  return PosBackorderFulfillRequest.findByDocumentNumber(documentNumber, pointOfSaleId);
}
