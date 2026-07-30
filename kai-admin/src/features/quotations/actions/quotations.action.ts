"use server";

import { revalidatePath } from "next/cache";
import {
  ConvertQuotationPayload,
  CreateQuotationPayload,
  ListQuotationsParams,
  QuotationsRequest,
} from "../infrastructure/quotations.request";

export async function listQuotationsAction(params: ListQuotationsParams = {}) {
  return QuotationsRequest.list(params);
}

export async function getQuotationByIdAction(id: string) {
  return QuotationsRequest.getById(id);
}

export async function getQuotationByDocumentAction(documentNumber: string) {
  return QuotationsRequest.getByDocumentNumber(documentNumber);
}

export async function createQuotationAction(payload: CreateQuotationPayload) {
  const res = await QuotationsRequest.create(payload);
  if (res.success) {
    revalidatePath("/sales/transactions/quotations");
    revalidatePath("/sales/quotations");
  }
  return res;
}

export async function cancelQuotationAction(id: string, reason?: string) {
  const res = await QuotationsRequest.cancel(id, reason);
  if (res.success) {
    revalidatePath("/sales/transactions/quotations");
    revalidatePath("/sales/quotations");
  }
  return res;
}

export async function convertQuotationAction(
  id: string,
  payload: ConvertQuotationPayload = {},
) {
  const res = await QuotationsRequest.convert(id, payload);
  if (res.success) {
    revalidatePath("/sales/transactions/quotations");
    revalidatePath("/sales/quotations");
    revalidatePath("/sales");
  }
  return res;
}
