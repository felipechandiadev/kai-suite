"use server";

import { DiningNumberingRequest } from "../infrastructure/dining-numbering.request";

export async function getDiningNumberingSettingsAction(branchId: string) {
  return DiningNumberingRequest.get(branchId);
}

export async function updateDiningNumberingSettingsAction(
  branchId: string,
  patch: {
    timezone?: string;
    resetTimeLocal?: string;
    allowWaiterOpenTable?: boolean;
    allowPosOpenTable?: boolean;
    posAccountsMenuCategoryIds?: string[];
  },
) {
  return DiningNumberingRequest.update(branchId, patch);
}
