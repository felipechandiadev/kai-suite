"use server";

import { revalidatePath } from "next/cache";
import { SII_FOLIOS } from "@/navigation/sii-routes";
import { PosFiscalRequest } from "../infrastructure/pos-fiscal.request";
import type { PosFiscalPolicy, UpsertPosFolioAllocationInput } from "../types/pos-fiscal.types";

export async function getPosFiscalPolicyAction(posId: string) {
  return PosFiscalRequest.getPolicy(posId);
}

export async function replacePosFiscalPolicyAction(posId: string, policy: PosFiscalPolicy) {
  const res = await PosFiscalRequest.replacePolicy(posId, policy);
  if (res.success) {
    revalidatePath("/sales/points-of-sale");
    revalidatePath(`/sales/points-of-sale/${posId}`);
  }
  return res;
}

export async function getPosFolioAllocationsAction(posId: string) {
  return PosFiscalRequest.listAllocations(posId);
}

export async function replacePosFolioAllocationsAction(
  posId: string,
  allocations: UpsertPosFolioAllocationInput[],
) {
  const res = await PosFiscalRequest.replaceAllocations(posId, allocations);
  if (res.success) {
    revalidatePath("/sales/points-of-sale");
    revalidatePath(`/sales/points-of-sale/${posId}`);
    revalidatePath(SII_FOLIOS);
  }
  return res;
}

export async function getFiscalFolioSummaryAction() {
  return PosFiscalRequest.getFolioSummary();
}
