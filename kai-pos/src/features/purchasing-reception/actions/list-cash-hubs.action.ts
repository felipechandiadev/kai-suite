"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { PurchasingReferencePosRequest } from "../infrastructure/purchasing-reference-pos.request";
import { CashHubsPosRequest } from "../infrastructure/cash-hubs-pos.request";
import type { CashHubRow } from "../types/cash-hub.types";

export async function listCashHubsForPurchasingPosAction(): Promise<CashHubRow[]> {
  const details = await PurchasingReferencePosRequest.getCompanyDetails();
  let companyId = details?.id != null ? String(details.id).trim() : "";
  if (!companyId) {
    const session = await getServerSession(authOptions);
    const fromSession =
      (session?.user as { activeCompanyId?: string | null; companyId?: string | null } | undefined)
        ?.activeCompanyId ??
      (session?.user as { companyId?: string | null } | undefined)?.companyId;
    companyId = fromSession != null ? String(fromSession).trim() : "";
  }
  if (!companyId) {
    return [];
  }
  return CashHubsPosRequest.list(companyId);
}
