"use server";

import { LaundryRequest } from "../infrastructure/laundry.request";
import type {
  CreateLaundryReceptionInput,
  LaundryReceptionStatus,
} from "../types/laundry.types";

export async function listLaundryCatalogAction() {
  return LaundryRequest.listCatalog();
}

export async function createLaundryReceptionAction(input: CreateLaundryReceptionInput) {
  return LaundryRequest.createReception(input);
}

export async function listLaundryReceptionsAction(input: {
  branchId?: string;
  status?: LaundryReceptionStatus;
  code?: string;
  page?: number;
  limit?: number;
}) {
  return LaundryRequest.listReceptions(input);
}

export async function getLaundryReceptionAction(id: string) {
  return LaundryRequest.getReception(id);
}

export async function updateLaundryReceptionStatusAction(
  id: string,
  status: LaundryReceptionStatus,
) {
  return LaundryRequest.updateStatus(id, status);
}

export async function recordLaundryReceptionPaymentAction(
  id: string,
  input: {
    paidAmount: number;
    saleTransactionId?: string;
    depositTransactionId?: string;
  },
) {
  return LaundryRequest.recordPayment(id, input);
}
