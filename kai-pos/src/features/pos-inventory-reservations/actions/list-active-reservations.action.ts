"use server";

import { PosInventoryReservationsRequest } from "../infrastructure/pos-inventory-reservations.request";

export async function listActivePosInventoryReservationsAction(input: {
  storageId: string;
  variantId?: string | null;
  productId?: string | null;
  customerId?: string | null;
}) {
  return PosInventoryReservationsRequest.listActive(input);
}

