"use server";

import { PosSaleForReturnRequest } from "../infrastructure/pos-sale-for-return.request";

export async function findSaleForReturnPosAction(documentNumber: string) {
  return PosSaleForReturnRequest.findByDocumentNumber(documentNumber);
}
