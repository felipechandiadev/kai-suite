"use server";

import { AttributesRequest } from "../infrastructure/attributes.request";
import type { AttributeListItem } from "../types/multimedia.types";

export async function listAttributesForStockAction(): Promise<AttributeListItem[]> {
  const res = await AttributesRequest.findAll();
  return res.success ? res.attributes : [];
}
