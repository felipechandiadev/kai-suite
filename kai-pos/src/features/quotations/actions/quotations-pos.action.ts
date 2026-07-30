"use server";

import {
  CreateQuotationPosPayload,
  QuotationsPosRequest,
} from "../infrastructure/quotations-pos.request";

export async function createQuotationPosAction(
  payload: CreateQuotationPosPayload,
) {
  return QuotationsPosRequest.create(payload);
}

export async function findQuotationByDocumentPosAction(documentNumber: string) {
  return QuotationsPosRequest.findByDocumentNumber(documentNumber);
}

export async function convertQuotationToSalePosAction(
  id: string,
  payload: {
    cashSessionId?: string;
    pointOfSaleId?: string;
  } = {},
) {
  return QuotationsPosRequest.convertToSale(id, payload);
}
