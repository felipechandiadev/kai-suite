"use server";

import { PackPosRequest } from "../infrastructure/pack-pos.request";

export async function getPackProducibleQtyAction(input: {
  variantId: string;
  storageId: string;
}) {
  return PackPosRequest.getProducibleQty(input);
}
