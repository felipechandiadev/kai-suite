"use server";

import { FiscalEffectiveOptionsRequest } from "../infrastructure/fiscal-effective-options.request";

export async function getEffectiveDocumentOptionsAction(pointOfSaleId: string) {
  return FiscalEffectiveOptionsRequest.getForPos(pointOfSaleId);
}
